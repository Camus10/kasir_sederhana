function refreshPage(){
  location.reload();
}

// Make a GET request to retrieve the nomor faktur
$.get('http://localhost:3000/generateNomorFaktur', function(data){
  // Use the retrieved nomor faktur
  let nomorFaktur = data.nomorFaktur;
  // Update the HTML content with the retrieved nomor faktur
  $('#no-faktur').val(nomorFaktur);
});

// Make a POST request to retrieve the nama kasir
$('#kode-kasir').on('input', function(){
  const kodeKasir = $(this).val();

  // Send a POST request to /getNamaKasir endpoint
  $.ajax({
    url: 'http://localhost:3000/getNamaKasir',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ kodeKasir: kodeKasir }),
    success: function(response){
      // Update nama-kasir input field with the received namaKasir value
      $('#nama-kasir').val(response.namaKasir);
    },
    error: function(xhr, status, error){
      // Handle error if needed
      $('#nama-kasir').val('');
    }
  });
});

// Get the current date and time
let now = new Date();
// Format the date and time as desired
let formattedDateTime = now.toLocaleString(); // Adjust formatting as needed
// Set the value of the 'waktu' input field to the current date and time
$('#waktu').val(formattedDateTime);

let rowIndex = 1; // initialise the rowIndex variable
function addRow(){
  let table = document.getElementById("itemsTable");
  let row = table.insertRow();
  let cell1 = row.insertCell(0);
  let cell2 = row.insertCell(1);
  let cell3 = row.insertCell(2);
  let cell4 = row.insertCell(3);
  let cell5 = row.insertCell(4);
  let cell6 = row.insertCell(5);

  // Increment the rowIndex for each new row
  let currentRowIndex = rowIndex++;

  // Assign unique IDs to each input and span element
  let kodeBarangId = 'kode_barang' + currentRowIndex;
  let namaBarangId = 'nama_barang' + currentRowIndex;
  let hargaId = 'harga' + currentRowIndex;
  let quantity = 'quantity' + currentRowIndex;
  let jumlahId = 'jumlah' + currentRowIndex;

  cell1.innerHTML = '<input type="text" class="form-control kode-barang" id="' + kodeBarangId + '" name="kodeBarang[]">';
  cell2.innerHTML = '<span class="nama-barang" id="' + namaBarangId + '"></span>';
  cell3.innerHTML = '<span class="harga" id="' + hargaId + '"></span>';
  cell4.innerHTML = '<input type="number" class="form-control quantity" id="' + quantity + '"name="quantity[]" oninput="validateInput(this)">';
  cell5.innerHTML = '<span class="jumlah" id="' + jumlahId + '"></span>';
  cell6.innerHTML = '<button type="button" class="btn btn-danger" onclick="deleteRow(this)">Delete</button>';

  // Listen for changes in kode barang input field
  $('#' + kodeBarangId).on('input', function(){
    let kodeBarang = $(this).val();
    let currentRow = $(this).closest('tr');
    getBarangInfo(kodeBarang, currentRow);
  });

  // Listen for changes in quantity input field
  $(cell4).find('.quantity').on('input', function(){
    let currentRow = $(this).closest('tr');
    updateJumlah();
    updateKembali();
  });

  // Recalculate total after adding a row
  updateTotal();
  // Recalculate kembali after adding a row
  updateKembali();
}

// Function to validate input for quantity field
function validateInput(input){
  // Remove any non-digit characters and convert to a number
  let newValue = parseInt(input.value.replace(/\D/g, '')) || 0;
  
  // Ensure the value is within the range of 1 to 9
  newValue = Math.min(Math.max(newValue, 1), 1000);
  
  // Update the input value with the validated value
  input.value = newValue;
}

// Function to delete a row from the table
function deleteRow(btn){
  let row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);

  // Recalculate total after deleting the row
  updateTotal();
  // Recalculate kembali after deleting the row
  updateKembali();
}

// Function to fetch barang info from server
function getBarangInfo(kodeBarang, row){
  $.ajax({
    url: 'http://localhost:3000/getBarangInfo',
    method: 'POST',
    contentType: 'application/json', // Specify content type as JSON
    data: JSON.stringify({ kodeBarang: kodeBarang }), // Send kodeBarang as JSON
    success: function(response){
      if(response.success){
        row.find('.nama-barang').text(response.namaBarang);
        row.find('.harga').text(response.harga);
      }
    },
    error: function(xhr, status, error){
      console.error('Error fetching barang info:', error);
      row.find('.nama-barang').text('');
      row.find('.harga').text('');
      row.find('.quantity').val('');
      row.find('.jumlah').text('');
    }
  });
}

// Function to update the 'jumlah' based on harga and quantity
function updateJumlah(){
  $('#itemsTable tr').each(function(){
    let harga = parseFloat($(this).find('.harga').text());
    let quantity = parseInt($(this).find('.quantity').val());
    let jumlah = harga * quantity;
    $(this).find('.jumlah').text(jumlah);
  });
}

// Function to update kembali
function updateKembali(){
  let total = calculateTotal();
  let jumlahBayar = parseFloat($('#jumlahBayar').val());

  if(isNaN(jumlahBayar)){
    $('#kembali').val('');

    return;
  }

  let kembali = jumlahBayar - total;
  if(kembali < 0){
    $('#kembali').val('Jumlah bayar kurang');
  }else{
    $('#kembali').val(kembali);
  }
}

// Function to update total
function updateTotal(){
  let total = calculateTotal();

  // Update the total field
  $('#total').val(total);
}

// Function to calculate the total from all the 'jumlah' values
function calculateTotal(){
  let total = 0;
  $('.jumlah').each(function() {
    let jumlah = parseFloat($(this).text());
    total += isNaN(jumlah) ? 0 : jumlah;
  });

  return total;
}

// Function to validate input for quantity field
function validateInputBayar(input){
  // Remove any non-digit characters and convert to a number
  let newValue = parseInt(input.value.replace(/\D/g, '')) || 0;
  
  // Ensure the value is within the range of 0 to 9
  newValue = Math.min(Math.max(newValue, ''), 999999999);
  
  // Update the input value with the validated value
  input.value = newValue;
}
// Update total and kembali when 'jumlahBayar' changes
$('#jumlahBayar').on('input', function(){
  let total = calculateTotal();
  let jumlahBayar = parseFloat($(this).val());
  let kembali;

  if(isNaN(jumlahBayar)){
    $('#kembali').val('');
  }else{
    kembali = jumlahBayar - total;
    
    if(kembali < 0){
      $('#kembali').val('Jumlah bayar kurang');
    }else{
      $('#kembali').val(kembali);
    }
  }
});

// Update total initially and whenever 'jumlah' values change
$(document).on('input', '.quantity', function(){
  let total = calculateTotal();
  $('#total').val(total);
});

// Function to handle form submission or button click event
function printReceipt(){
  // Extract data from the form or any other source
  const noFaktur = $('#no-faktur').val();
  const kodeKasir = $('#kode-kasir').val();
  const waktu = $('#waktu').val();
  const total = $('#total').val();
  const jumlahBayar = $('#jumlahBayar').val();
  const kembali = $('#kembali').val();
  const items = [];

  // Getting all items inside table body
  let rows = $('#itemsTable tr').length;
  for(let i = 0; i < rows; i++){
    items.push({ 
      kode_barang: $('#kode_barang' + (i + 1)).val(),
      nama_barang: $('#nama_barang' + (i + 1)).text(),
      harga: $('#harga' + (i + 1)).text(),
      quantity: $('#quantity' + (i + 1)).val(),
      jumlah: $('#jumlah' + (i + 1)).text()
    });
  }

  // Prepare the data object to send to the server
  const requestData = {
    noFaktur: noFaktur,
    kodeKasir: kodeKasir,
    waktu: waktu,
    total: total,
    jumlahBayar: jumlahBayar,
    kembali: kembali,
    items: items
  };

  // Send a POST request to /printReceipt endpoint
  $.ajax({
    url: 'http://localhost:3000/printReceipt',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(requestData),
    success: function(response){
      // Handle success response
      Swal2.fire({
        title: "Kwitansi diterbitkan",
        html:
          `<div id="receipt" class="receipt-container">
            <img src="./assets/image/LogoSRU.png" alt="Logo" class="logo" style="width: 50%;">
            <hr>
            <div class="receipt-info">
              <div>Nomor Faktur: ${response.receipt.noFaktur}</div>
              <div>Kode Kasir: ${response.receipt.kodeKasir}</div>
              <div>Waktu: ${response.receipt.waktu}</div>
              <div>Total Harga: Rp ${response.receipt.total}</div>
            </div>
            <hr>
            <div class="receipt-items">
              ${response.receipt.items.map(item => `
                <div class="item">
                  <div>Nama Barang: ${item.nama_barang}</div>
                  <div>Harga: Rp ${item.harga}</div>
                  <div>Jumlah: ${item.quantity}</div>
                  <div>Harga: Rp ${item.jumlah}</div>
                  <div>--------------------------------------------------</div>
                </div>
              `).join('')}
            </div>
            <div class="receipt-info">
              <div>Petugas Kasir : ${response.receipt.namaKasir}</div>
              <div>Total Harga: Rp ${response.receipt.total}</div>
              <div>Bayar: Rp ${response.receipt.jumlahBayar}</div>
              <div>Kembalian: Rp ${response.receipt.kembali}</div>
            </div>
          </div>`,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: "Ya",
        cancelButtonText: "Tidak",
      }).then((result) => {
        if(result.isConfirmed){
          // Print the receipt
          var printContent = document.getElementById('receipt').outerHTML;
          var originalContent = document.body.innerHTML;
          document.body.innerHTML = printContent;
          window.print();
          document.body.innerHTML = originalContent;

          // Reload the page or perform other actions if needed
          refreshPage();
        }else{
          // Handle other cases here, if needed
          refreshPage();
        }
      });
    },
    error: function(xhr, status, error){
      // Handle error response
      console.error('Error printing receipt: ', error);
      Swal2.fire({
        icon: "warning",
        title: "Kesalahan input atau server tidak merespon",
      })
    }
  });
}

function showModal(){
  // Show the modal
  $('#modalDataPenjualan').modal('show');

  // Check if the header exists
  let headerExists = $('#dataPenjualan thead').length > 0;
  if(!headerExists){
    $('#dataPenjualan').append('<thead><tr><th>Waktu</th><th>Nomor Faktur</th><th>Nama Barang</th><th>Kuantitas</th><th>Harga</th><th>Jumlah</th><th>Total</th></tr></thead>');
  }

  // Make a GET request to retrieve the data penjualan
  $.ajax({
    url: 'http://localhost:3000/dataPenjualan',
    method: 'GET',
    success: function(response){
      // Once data is successfully fetched, initialise the DataTable
      $('#dataPenjualan').DataTable({
        data: response,
        columns: [
          { data: 'waktu' },
          { data: 'no_faktur' },
          { data: 'nama_barang' },
          { data: 'quantity' },
          { data: 'harga' },
          { data: 'jumlah' },
          { data: 'total' }
        ]
      });
    },
    error: function(xhr, status, error){
      console.error('Error fetching data:', error);
    }
  });
}
function closeModal(){
  $('#modalDataPenjualan').modal('hide');

  // Destroy the DataTable instance and clear the table data
  $('#dataPenjualan').DataTable().destroy();
  $('#dataPenjualan').empty(); // Clear the table content
}