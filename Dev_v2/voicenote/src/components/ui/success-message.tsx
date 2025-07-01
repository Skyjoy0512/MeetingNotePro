'use client';

import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SuccessMessageProps {
  title: string;
  message: string;
  className?: string;
}

export const SuccessMessage = ({ title, message, className = '' }: SuccessMessageProps) => {
  return (
    <Card className={`border-green-200 bg-green-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-green-800">{title}</h3>
            <p className="text-sm text-green-700 mt-1">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};