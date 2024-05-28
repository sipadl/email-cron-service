const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const config = {
  db: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'pbb',
  },
};

const knex = require('knex')({
  client: 'mysql2',
  connection: config.db,
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'freshontime31@gmail.com',
    pass: 'gxnq wyiy gxfe pmmt',
  },
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Check database connection on startup
knex.raw('SELECT 1+1 AS result')
  .then((result) => {
    console.log('Database connection successful:', result);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit the process if the connection fails
  });

// Generate email body
generateEmailBody = (data) => {
  const supplier = [];
  data.forEach((val) => {
    supplier.push(`<tr><td>${val.kode_supplier}</td> \n <td>${val.nama_supplier}</td></tr>`);
  });

  const emailBody = `
    <h2>Pembayaran Belum Dilunasi</h2>
    <p>Halo,</p>
    <p>Kami ingin menginformasikan bahwa pembayaran belum dilunasi oleh beberapa supplier. Berikut adalah detailnya:</p>
    <table border="1">
      <thead>
        <tr>
          <th>Kode Supplier</th>
          <th>Nama Supplier</th>
        </tr>
      </thead>
      <tbody>
       ${supplier.join('')}
      </tbody>
    </table>
    <p>Harap segera menyelesaikan pembayaran agar kami dapat melanjutkan proses. Terima kasih.</p>
  `;
  
  return emailBody;
}

// Inisialisasi cron job
const job = cron.schedule('0 9 * * *', async () => {
  console.log('Cron job running every 5 minutes');
  const data = await knex('tbl_daging as a')
    .select('*')
    .join('tbl_supplier as b', 'b.kode_supplier', '=', 'a.supplier')
    .whereRaw('ABS(DATEDIFF(NOW(), a.tanggal)) = 3','AND','is_lunas = false');

  const recipients = await knex.select('email').table('tbl_user').where('role', 9);

  const mailOptions = {
    from: 'freshontime31@gmail.com',
    to: recipients.map(recipient => recipient.email).join(','),
    subject: "Pembayaran sudah melewati batas akhir",
    html: generateEmailBody(data)
  };

  transporter.sendMail(mailOptions, (error, result) => {
    knex.insert()
    if (error) {
      console.error(error.message);
    }
    console.warn(result.message);
  });
});

// Mulai cron job
job.start();

const PORT = process.env.PORT || 2080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
