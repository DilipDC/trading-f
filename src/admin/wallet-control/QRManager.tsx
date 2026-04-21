import React, { useState } from 'react';

const QRManager: React.FC = () => {
  const [qrUrl, setQrUrl] = useState('/assets/images/qr-code-placeholder.svg');

  return (
    <div>
      <h4>QR Manager</h4>
      <img src={qrUrl} alt="UPI QR" style={{ maxWidth: 180 }} />
      <input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="QR image URL" />
    </div>
  );
};

export default QRManager;
