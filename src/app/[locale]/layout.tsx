import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import {NextIntlClientProvider, useMessages} from "next-intl";

export const metadata: Metadata = {
  title: "Corrector de Subtítulos",
  description: "Corrector de Subtítulos",
};


export default function HomeLayout({children,params: {locale}}: {children: React.ReactNode;params: {locale: string};}) {

    const messages = useMessages();

    return (
    <html data-theme="dark" lang={locale}>
      <body>
      <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
      </NextIntlClientProvider>
      </body>
    </html>
  );
}