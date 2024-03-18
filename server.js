const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
// Parse JSON request bodies
app.use(bodyParser.json());
// Enable CORS
app.use(cors());

const PORT = process.env.PORT || 3000;
// MySQL database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sru'
});

// Connect to MySQL database
connection.connect((err) => {
  if(err){
    console.error('Error connecting to MySQL database:', err);
    return;
  }

  console.log('Connected to MySQL database');
});

// Route to generate unique nomor faktur
app.get('/generateNomorFaktur', (req, res) => {
  generateNomorFaktur(connection)
    .then((nomorFaktur) => {
      res.json({ nomorFaktur });
    })
    .catch((err) => {
      console.error('Error generating nomor faktur:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});
// Function to generate unique nomor faktur
function generateNomorFaktur(connection){
  return new Promise((resolve, reject) => {
    let nomorFaktur = 'MR-' + Math.floor(Math.random() * 9000 + 1000) + Math.floor(Math.random() * 9000 + 1000);

    // Check if nomor faktur already exists in the database
    const query = 'SELECT COUNT(*) AS count FROM receipt_header WHERE no_faktur = ?';
    connection.query(query, [nomorFaktur], (err, results) => {
      if(err){
        reject(err);

        return;
      }

      const existingNomorFakturCount = results[0].count;

      // If nomor faktur already exists, generate a new one
      if(existingNomorFakturCount > 0){
        generateNomorFaktur(connection).then(resolve).catch(reject);
      }else{
        resolve(nomorFaktur);
      }
    });
  });
}

// Route to handle the request for retrieving nama kasir based on kode kasir
app.post('/getNamaKasir', (req, res) => {
  const { kodeKasir } = req.body; // Access kodeKasir from request body

  // SQL query to retrieve nama kasir based on kode kasir
  const sql = 'SELECT nama_kasir FROM kasir WHERE kode_kasir = ?';

  // Execute the query
  connection.query(sql, [kodeKasir], (err, results) => {
    if(err){
      res.status(500).json({ error: 'An error occurred while fetching nama kasir' });

      return;
    }

    if(results.length === 0){
      // If no matching kasir found, send appropriate response
      res.status(404).json({ error: 'Kasir not found' });
    }else{
      // If kasir found, send the nama kasir as response
      res.json({ namaKasir: results[0].nama_kasir });
    }
  });
});

// Route to handle the request for retrieving barang info based on kode barang
app.post('/getBarangInfo', (req, res) => {
  const { kodeBarang } = req.body;

  // SQL query to retrieve barang info based on kode barang
  const sql = 'SELECT nama_barang, harga FROM barang WHERE kode_barang = ?';

  // Execute the query
  connection.query(sql, [kodeBarang], (err, results) => {
    if(err){
      return res.status(500).json({ error: 'An error occurred while fetching barang info' });
    }

    if(results.length === 0){
      return res.status(404).json({ error: 'Barang not found' });
    }

    // If barang found, send the nama barang and harga as response
    res.json({ success: true, namaBarang: results[0].nama_barang, harga: results[0].harga });
  });
});

// Define a POST endpoint for printing a receipt
app.post('/printReceipt', (req, res) => {
  // Extract information from the request body
  const { noFaktur, kodeKasir, waktu, total, jumlahBayar, kembali, items } = req.body;
  
  // Parse the waktu field into a JavaScript Date object
  var dateString = waktu;
  var parts = dateString.split(", ");
  var dateParts = parts[0].split("/");
  var month = parseInt(dateParts[0]) - 1;
  var day = parseInt(dateParts[1]);
  var year = parseInt(dateParts[2]);
  var timeParts = parts[1].split(":");
  var hours = parseInt(timeParts[0]);
  var minutes = parseInt(timeParts[1]);
  var seconds = parseInt(timeParts[2]);
  if(parts[1].includes("PM") && hours < 12){
    hours += 12;
  }
  var waktuParsed = new Date(year, month, day, hours, minutes, seconds);

  // Perform validation on jumlahBayar
  if(isNaN(Number(jumlahBayar)) || Number(jumlahBayar) < 0 || Number(jumlahBayar) < Number(total)){
    return res.status(400).json({ success: false, message: 'Invalid jumlahBayar value' });
  }

  // SQL query to retrieve nama kasir based on kode kasir
  const sql = 'SELECT id, nama_kasir FROM kasir WHERE kode_kasir = ?';

  // Execute the query to retrieve nama kasir
  connection.query(sql, [kodeKasir], (err, results) => {
    if(err){
      console.error('Error retrieving id kasir: ', err);
      return res.status(500).json({ success: false, message: 'Error printing receipt 1' });
    }

    if(results.length === 0){
      return res.status(404).json({ success: false, message: 'Kasir not found' });
    }

    const idKasir = results[0].id;
    const namaKasir = results[0].nama_kasir;

    // Insert the receipt information into the database
    const insertHeaderSql = 'INSERT INTO receipt_header (no_faktur, id_kasir, waktu, total) VALUES (?, ?, ?, ?)';
    connection.query(insertHeaderSql, [noFaktur, idKasir, waktuParsed, total], (insertHeaderErr, insertHeaderResults) => {
      if(insertHeaderErr){
        console.error('Error inserting receipt header: ', insertHeaderErr);
        return res.status(500).json({ success: false, message: 'Error printing receipt' });
      }

      const insertHeaderId = insertHeaderResults.insertId;
      const insertDetailValues = [];

      // Iterate over the items array to fetch id_barang for each item
      items.forEach(item => {
        const { kode_barang, quantity, harga, jumlah } = item;
        
        // Query to fetch id_barang based on kode_barang
        const sql = 'SELECT id FROM barang WHERE kode_barang = ?';

        // Execute the query to fetch id_barang
        connection.query(sql, [kode_barang], (err, results) => {
          if(err){
            console.error('Error retrieving id_barang: ', err);
            return res.status(500).json({ success: false, message: 'Error printing receipt 3' });
          }

          if(results.length === 0){
            console.error('Barang not found for kode_barang: ', kode_barang);
            return res.status(404).json({ success: false, message: 'Barang not found' });
          }

          const id_barang = results[0].id;

          // Push the values to the insertDetailValues array
          insertDetailValues.push([insertHeaderId, id_barang, quantity, harga, jumlah]);

          // Check if all items have been processed
          if(insertDetailValues.length === items.length){
            // Once all id_barang values are fetched, insert the receipt detail information
            connection.query('INSERT INTO receipt_detail (id_receipt, id_barang, quantity, harga, jumlah) VALUES ?', [insertDetailValues], (insertDetailErr, insertDetailResults) => {
              if(insertDetailErr){
                console.error('Error inserting receipt detail: ', insertDetailErr);
                return res.status(500).json({ success: false, message: 'Error printing receipt 4' });
              }

              // Return success response if the insertion is successful
              res.json({
                success: true,
                message: 'Receipt printed successfully!',
                receipt: {
                  noFaktur,
                  kodeKasir,
                  namaKasir,
                  waktu,
                  total,
                  jumlahBayar,
                  kembali,
                  items
                }
              });
            });
          }
        });
      });
    });
  });
});

// Define a GET endpoint to fetch data from the database
app.get('/dataPenjualan', (req, res) => {
  // SQL query to fetch data
  const sql = `
    SELECT 
      DATE_FORMAT(a.waktu, '%Y-%m-%d %H:%i:%s') AS waktu, 
      a.no_faktur, 
      c.nama_barang, 
      b.quantity, 
      b.harga, 
      b.jumlah, 
      a.total
    FROM 
      receipt_header a
    LEFT JOIN 
      receipt_detail b ON b.id_receipt = a.id
    LEFT JOIN 
      barang c ON c.id = id_barang
    ORDER BY 
      waktu ASC;
  `;

  // Execute the query
  connection.query(sql, (err, results) => {
    if(err){
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'An error occurred' });
      
      return;
    }
    
    // Send the results as JSON
    res.json(results);
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});