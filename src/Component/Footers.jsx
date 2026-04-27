import React from "react";

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-6 mt-20">
      
         

        <div className="flex flex-col md:row justify-between items-center gap-6 text-xs font-medium">
          <p>© {new Date().getFullYear()} ImageApp. Built with ❤️ for the web.</p>
          <div className="flex gap-6">
            
          </div>
        </div>
      
    </footer>
  );
}

export default Footer;