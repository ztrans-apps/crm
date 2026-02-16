'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone } from 'lucide-react';
import Image from 'next/image';

interface QRCodeProps {
  sessionId: string;
  onClose?: () => void;
  onConnected?: () => void;
}

function QRExpiryTimer({ expiryTime }: { expiryTime: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  if (timeLeft === 0) {
    return (
      <div className="mt-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 font-medium">
          ⏱️ QR code expired - waiting for new code...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm text-green-800">
        ⏱️ QR code expires in <span className="font-bold">{timeLeft}</span> seconds
      </p>
    </div>
  );
}

export function QRCode({ sessionId, onClose, onConnected }: QRCodeProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiryTime, setQrExpiryTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let qrReceived = false;
    let lastQrCode: string | null = null;
    let qrExpiredCount = 0;
    const MAX_QR_EXPIRED = 3;
    let connectionDetected = false;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/whatsapp/qr/${sessionId}`);

        if (response.ok) {
          const data = await response.json();

          if (data.qr && data.qr !== lastQrCode) {
            setQrCode(data.qr);
            lastQrCode = data.qr;
            qrReceived = true;
            setQrExpiryTime(Date.now() + 40000);
            setError(null);
            connectionDetected = false;
          } else if (qrReceived && !data.qr && data.status !== 'connected') {
            qrExpiredCount++;

            if (qrExpiredCount >= MAX_QR_EXPIRED) {
              clearInterval(interval);
              setError('QR code expired multiple times. Please try reconnecting again.');
              return;
            }

            setError('QR code expired. Waiting for new QR code...');
            setQrCode(null);
          }

          if (data.status === 'connected' && qrReceived && !connectionDetected) {
            connectionDetected = true;
            clearInterval(interval);

            setTimeout(() => {
              onConnected?.();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to fetch QR:', error);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      if (!connectionDetected) {
        setError('QR code generation timeout. Please try reconnecting again.');
      }
    }, 180000);

    return () => clearInterval(interval);
  }, [sessionId, onConnected]);

  return (
    <Card className="border-2 border-green-500 shadow-lg">
      <CardHeader className="bg-green-50">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Smartphone className="h-5 w-5" />
          Scan QR Code to Connect
        </CardTitle>
        <CardDescription className="text-green-700">
          Use your phone to scan this QR code and link your WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center">
          {qrCode ? (
            <>
              <div className="relative p-4 bg-white rounded-xl shadow-md">
                <Image
                  src={qrCode}
                  alt="QR Code"
                  width={280}
                  height={280}
                  className="rounded-lg"
                />
              </div>
              {qrExpiryTime && <QRExpiryTimer expiryTime={qrExpiryTime} />}
            </>
          ) : (
            <div className="w-72 h-72 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Generating QR Code...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md">
            <h4 className="font-medium text-blue-900 mb-2">How to connect:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Open WhatsApp on your phone</li>
              <li>Tap Menu (⋮) or Settings</li>
              <li>Select "Linked Devices"</li>
              <li>Tap "Link a Device"</li>
              <li>Point your phone at this screen to scan the code</li>
            </ol>
          </div>

          {onClose && (
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
