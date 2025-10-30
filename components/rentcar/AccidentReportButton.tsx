/**
 * 렌트카 사고 신고 원터치 버튼
 * - 렌트카 이용 중 화면에 긴급 버튼 표시
 * - 클릭 시 사고 신고 폼 모달 오픈
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';
import AccidentReportForm from './AccidentReportForm';

interface AccidentReportButtonProps {
  bookingId: number;
  vehicleId: number;
  vendorId: number;
  userId: number;
  bookingNumber: string;
  vehicleName: string;
}

export default function AccidentReportButton({
  bookingId,
  vehicleId,
  vendorId,
  userId,
  bookingNumber,
  vehicleName
}: AccidentReportButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        onClick={() => setIsFormOpen(true)}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 shadow-lg"
      >
        <AlertTriangle className="mr-2 h-5 w-5" />
        긴급 사고 신고
      </Button>

      {isFormOpen && (
        <AccidentReportForm
          bookingId={bookingId}
          vehicleId={vehicleId}
          vendorId={vendorId}
          userId={userId}
          bookingNumber={bookingNumber}
          vehicleName={vehicleName}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </>
  );
}
