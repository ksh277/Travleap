import React, { useState } from 'react';
import { MapPin, Calendar as CalendarIcon, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';

interface Props {
  destination?: string;
  onDestinationChange?: (v: string) => void;
  checkIn?: string;
  checkOut?: string;
  onDateChange?: (from?: string, to?: string) => void;
  guests?: { rooms: number; adults: number; children: number };
  onGuestsChange?: (g: { rooms: number; adults: number; children: number }) => void;
  timeOption?: string;
  onTimeChange?: (t: string) => void;
  onSearch?: () => void;
}

const CategorySearchBar: React.FC<Props> = ({
  destination = '',
  onDestinationChange = () => {},
  checkIn,
  checkOut,
  onDateChange = () => {},
  timeOption = '선택안함',
  onTimeChange = () => {},
  guests = { rooms: 1, adults: 1, children: 0 },
  onGuestsChange = () => {},
  onSearch = () => {}
}: Props) => {
  const [showCal, setShowCal] = useState(false);
  const [localFrom, setLocalFrom] = useState<string | undefined>(checkIn);
  const [localTo, setLocalTo] = useState<string | undefined>(checkOut);

  return null;
};

export default CategorySearchBar;

