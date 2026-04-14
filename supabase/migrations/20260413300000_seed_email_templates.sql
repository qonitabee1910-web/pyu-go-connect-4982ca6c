-- Insert default email templates with HTML formatting
INSERT INTO public.email_templates (type, subject, body_html, body_text, preview, is_active)
VALUES
(
  'user_verification',
  'Verifikasi Email Anda di PYU GO',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header img { max-width: 120px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .code-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 3px; font-family: monospace; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://cdn.jsdelivr.net/gh/yourusername/pyu-go/logo_pyu.png" alt="PYU GO">
      <h1>Verifikasi Email Anda</h1>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Terima kasih telah mendaftar di <strong>PYU GO</strong>! Untuk melanjutkan, silakan verifikasi email Anda menggunakan kode di bawah ini:</p>
      
      <div class="code-box">
        <div class="code">{{verification_code}}</div>
      </div>
      
      <p>Atau klik tombol di bawah untuk verifikasi langsung:</p>
      <div style="text-align: center;">
        <a href="{{verification_link}}" class="button">Verifikasi Email Saya</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">Kode ini akan berlaku selama 24 jam. Jika Anda tidak mendaftar, abaikan email ini.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
      <p>Pertanyaan? Hubungi kami di support@pyugo.com</p>
    </div>
  </div>
</body>
</html>',
  'Verifikasi email Anda di PYU GO. Kode: {{verification_code}}',
  'Verifikasi email untuk mendaftar di PYU GO',
  true
),
(
  'driver_verification',
  'Verifikasi Email Driver Partner - PYU GO',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header img { max-width: 120px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; }
    .badge { display: inline-block; background: white; color: #059669; padding: 5px 15px; border-radius: 20px; font-weight: 600; margin-top: 10px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .code-box { background: #f0fdf4; border: 2px solid #059669; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 3px; font-family: monospace; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://cdn.jsdelivr.net/gh/yourusername/pyu-go/pyu_go_icon.png" alt="PYU GO Driver">
      <h1>Selamat Datang, Kapten!</h1>
      <span class="badge">Driver Partner</span>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Terima kasih telah bergabung sebagai <strong>Driver Partner PYU GO</strong>! Kami sangat senang Anda berada di tim kami.</p>
      <p>Untuk mengaktifkan akun driver Anda, silakan verifikasi email dengan kode berikut:</p>
      
      <div class="code-box">
        <div class="code">{{verification_code}}</div>
      </div>
      
      <p>Atau klik tombol di bawah:</p>
      <div style="text-align: center;">
        <a href="{{verification_link}}" class="button">Verifikasi & Mulai Berkendara</a>
      </div>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <strong>Langkah Selanjutnya:</strong><br>
        1. Verifikasi email Anda<br>
        2. Lengkapi dokumen driver (SIM, STNK, asuransi)<br>
        3. Tunggu verifikasi admin<br>
        4. Mulai terima pesanan rides
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">Butuh bantuan? Hubungi tim support driver kami di driver-support@pyugo.com</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
    </div>
  </div>
</body>
</html>',
  'Verifikasi email driver Anda. Kode: {{verification_code}}',
  'Verifikasi email sebagai driver partner PYU GO',
  true
),
(
  'password_reset',
  'Reset Password Akun PYU GO Anda',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Reset Password</h1>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru:</p>
      
      <div style="text-align: center;">
        <a href="{{reset_link}}" class="button">Reset Password Saya</a>
      </div>
      
      <p style="color: #6b7280; margin-top: 20px;">atau salin link ini di browser Anda:<br>
      <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 12px;">{{reset_link}}</code></p>
      
      <div class="warning">
        <strong>⚠️ Penting:</strong> Link reset password ini hanya berlaku selama 1 jam. Jika link sudah expired, Anda dapat meminta link baru.
      </div>
      
      <p style="color: #ef4444; font-weight: 600;">Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
      <p>Pertanyaan keamanan? Hubungi {{support_email}}</p>
    </div>
  </div>
</body>
</html>',
  'Reset password akun PYU GO Anda',
  'Permintaan reset password untuk akun PYU GO',
  true
),
(
  'welcome_user',
  'Selamat Datang di PYU GO! 🎉',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .feature { background: #f0fdf4; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; border-radius: 4px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Selamat Datang! 🎉</h1>
      <p style="margin: 10px 0 0 0;">Akun Anda berhasil dibuat</p>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Email Anda telah diverifikasi. Sekarang Anda siap menggunakan semua layanan PYU GO!</p>
      
      <div class="feature">
        <strong>🚗 Pesan Ride</strong><br>
        Nikmati perjalanan nyaman dengan driver profesional kami
      </div>
      
      <div class="feature">
        <strong>🚌 Kerjakan Shuttle</strong><br>
        Opsi transportasi massal yang efisien dan terjangkau
      </div>
      
      <div class="feature">
        <strong>🏨 Jelajahi Hotel</strong><br>
        Kemitraan eksklusif dengan hotel terbaik di kota Anda
      </div>
      
      <div class="feature">
        <strong>💳 Dompet Digital</strong><br>
        Top-up mudah dan pembayaran yang lebih cepat
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboard_link}}" class="button">Mulai Menggunakan PYU GO</a>
      </div>
      
      <p style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <strong>💡 Tips:</strong> Lengkapi profil Anda untuk mengakses fitur premium dan penawaran khusus dari kami!
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
      <p>Ada pertanyaan? Kunjungi <a href="{{help_link}}" style="color: #10b981;">pusat bantuan</a> kami</p>
    </div>
  </div>
</body>
</html>',
  'Selamat datang di PYU GO {{full_name}}!',
  'Welcome email untuk user baru PYU GO',
  true
),
(
  'welcome_driver',
  'Selamat Datang di Tim Driver Partner PYU GO! 🚗',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 5px 15px; border-radius: 20px; font-weight: 600; margin-top: 10px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .step { background: #f0fdf4; padding: 15px; margin: 10px 0; border-left: 4px solid #059669; border-radius: 4px; counter-increment: step; }
    .step::before { content: counter(step); background: #059669; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Selamat Datang, Kapten! 🚗</h1>
      <span class="badge">Driver Partner</span>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Email Anda telah diverifikasi dan akun driver Anda siap digunakan! Kami sangat senang memiliki Anda di tim kami.</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #059669;">📋 Langkah Berikutnya:</h3>
        <div style="counter-reset: step;">
          <div class="step">Lengkapi profil driver Anda</div>
          <div class="step">Upload dokumen (SIM, STNK, asuransi)</div>
          <div class="step">Tunggu verifikasi admin (biasanya 1-2 hari)</div>
          <div class="step">Mulai terima request ride & dapatkan earning!</div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboard_link}}" class="button">Buka Dashboard Driver</a>
      </div>
      
      <p style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
        <strong>💡 Tips Sukses:</strong><br>
        • Pastikan foto profil profesional<br>
        • Lengkapi semua dokumen dengan jelas<br>
        • Respons cepat terhadap request pengguna<br>
        • Jaga rating tinggi untuk mendapat bonus
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
      <p>Pertanyaan driver? Hubungi {{support_email}}</p>
    </div>
  </div>
</body>
</html>',
  'Selamat datang sebagai driver partner PYU GO {{full_name}}!',
  'Welcome email untuk driver baru',
  true
),
(
  'documents_requested',
  'Mohon Unggah Dokumen - PYU GO Driver',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; }
    .doc-item { background: #eff6ff; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; border-radius: 4px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Dokumen Diperlukan</h1>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Untuk melanjutkan proses verifikasi, kami memerlukan dokumen-dokumen berikut dari Anda:</p>
      
      <div class="doc-item">
        <strong>📋 Surat Izin Mengemudi (SIM)</strong><br>
        Foto atau scan SIM yang masih berlaku
      </div>
      
      <div class="doc-item">
        <strong>🚗 Surat Tanda Nomor Kendaraan (STNK)</strong><br>
        Foto atau scan STNK kendaraan Anda
      </div>
      
      <div class="doc-item">
        <strong>🛡️ Asuransi Kendaraan</strong><br>
        Bukti asuransi yang masih aktif
      </div>
      
      <div class="doc-item">
        <strong>📸 Foto KTP</strong><br>
        Foto atau scan KTP yang jelas dan terbaca
      </div>
      
      <p style="color: #ef4444; margin-top: 20px; font-weight: 600;">
        ⏰ Mohon lengkapi dalam 7 hari untuk tidak mempengaruhi aktivasi akun Anda.
      </p>
      
      <div style="text-align: center;">
        <a href="{{dashboard_link}}" class="button">Unggah Dokumen Sekarang</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Semua dokumen Anda diamankan dengan enkripsi tingkat bank. Kami tidak akan membagikan data Anda kepada pihak ketiga.
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
      <p>Ada masalah? Hubungi {{support_email}}</p>
    </div>
  </div>
</body>
</html>',
  'Mohon unggah dokumen driver Anda',
  'Email permintaan dokumen untuk driver verification',
  true
),
(
  'payment_received',
  'Pembayaran Diterima! 💰 - PYU GO',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 40px 20px; }
    .amount { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .amount-value { font-size: 36px; font-weight: bold; color: #059669; }
    .details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Pembayaran Diterima!</h1>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Terima kasih atas pembayaran Anda. Transaksi telah berhasil diproses.</p>
      
      <div class="amount">
        <div style="color: #6b7280; margin-bottom: 10px;">Jumlah Pembayaran</div>
        <div class="amount-value">{{amount}}</div>
      </div>
      
      <div class="details">
        <p style="margin: 0;"><strong>ID Transaksi:</strong> {{transaction_id}}</p>
        <p style="margin: 5px 0;"><strong>Tanggal:</strong> {{transaction_date}}</p>
        <p style="margin: 5px 0;"><strong>Metode:</strong> {{payment_method}}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboard_link}}" class="button">Lihat Riwayat Transaksi</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Jika ada pertanyaan tentang pembayaran ini, hubungi tim support kami.
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
    </div>
  </div>
</body>
</html>',
  'Pembayaran Anda telah diterima',
  'Konfirmasi pembayaran transaksi',
  true
),
(
  'withdrawal_processed',
  'Penarikan Dana Berhasil Diproses - PYU GO',
  E'<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 40px 20px; }
    .amount { background: #f0fdf4; border: 2px solid #059669; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .amount-value { font-size: 36px; font-weight: bold; color: #047857; }
    .status { background: #d1fae5; border-left: 4px solid #059669; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Penarikan Dana Diproses</h1>
    </div>
    <div class="content">
      <p>Halo {{full_name}},</p>
      <p>Permintaan penarikan dana Anda telah berhasil diproses dan sedang dalam perjalanan ke rekening bank Anda.</p>
      
      <div class="amount">
        <div style="color: #6b7280; margin-bottom: 10px;">Jumlah Penarikan</div>
        <div class="amount-value">{{amount}}</div>
      </div>
      
      <div class="status">
        <strong>✓ Status: Diproses</strong><br>
        <small>Dana biasanya masuk dalam 1-3 hari kerja</small>
      </div>
      
      <div class="details">
        <p style="margin: 0;"><strong>Rekening Tujuan:</strong> {{bank_account}}</p>
        <p style="margin: 5px 0;"><strong>Nomor Referensi:</strong> {{reference_number}}</p>
        <p style="margin: 5px 0;"><strong>Tanggal Permintaan:</strong> {{request_date}}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboard_link}}" class="button">Lihat Detail Penarikan</a>
      </div>
      
      <p style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
        <strong>💡 Tip:</strong> Monitor status penarikan di dashboard Anda atau hubungi bank untuk konfirmasi.
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 PYU GO. Semua hak dilindungi.</p>
    </div>
  </div>
</body>
</html>',
  'Penarikan dana Anda telah diproses',
  'Konfirmasi pengajuan penarikan dana',
  true
)
ON CONFLICT (type) DO NOTHING;
