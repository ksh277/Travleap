"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <DayPicker
        locale={ko}
        showOutsideDays={showOutsideDays}
        className={className}
        classNames={classNames}
        {...props}
      />
    </div>
  );
}

export { Calendar };
