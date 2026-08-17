import "./globals.css";

export const metadata = {
  title: "Grade Arena — Compete. Improve. Celebrate.",
  description:
    "Track weighted grades, project your GPA, and opt in to friendly competition — on your terms, with grade privacy on by default.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;0,900;1,500&family=Big+Shoulders+Display:wght@600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Fragment+Mono:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('gr_theme_v1')?JSON.parse(localStorage.getItem('gr_theme_v1')):'dark'}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
