 import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Footer from "./Component/Footers";
import ImageCompressor from "./Component/Images";

 import Navbar from "./Navbar";


function App() {
  return (
     <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-700">
         <Navbar />


             <ImageCompressor/>



         
         <Footer />
       </div>
     </Router>

    
      


    
  );
}

export default App;

