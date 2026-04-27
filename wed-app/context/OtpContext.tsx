import React, { createContext, ReactNode, useContext, useState } from 'react';

type OtpDataType = {
  contact_no?: string;
  otp?: string;
  is_verified?: boolean;
};

type OtpContextType = {
  otpData: OtpDataType;
  setOtpData: React.Dispatch<React.SetStateAction<OtpDataType>>;
};

const OtpContext = createContext<OtpContextType | undefined>(undefined);

export const OtpProvider = ({ children }: { children: ReactNode }) => {
  const [otpData, setOtpData] = useState<OtpDataType>({});
  return (
    <OtpContext.Provider value={{ otpData, setOtpData }}>
      {children}
    </OtpContext.Provider>
  );
};

export const useOtp = () => {
  const context = useContext(OtpContext);
  if (!context) throw new Error('useOtp must be used within OtpProvider');
  return context;
};
