"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const Hero = () => {
  return (
    <section className="pt-28 pb-20 px-4 overflow-hidden">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <motion.div 
            className="lg:w-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.span 
              className="inline-block py-1 px-4 rounded-full bg-primary-100 text-primary-700 font-medium text-sm mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Empowering Kenya's Youth
            </motion.span>
            
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Building <span className="gradient-text">sustainable future</span> through green & digital innovation
            </motion.h1>
            
            <motion.p 
              className="text-gray-600 text-lg mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              A digital learning platform empowering young Kenyans with green economy skills
              and digital literacy for sustainable careers and environmental innovation.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <a 
                href="#modules" 
                className="gradient-button py-3 px-8 font-semibold rounded-2xl text-center"
              >
                Start Learning
              </a>
              <a 
                href="#ask-ai" 
                className="py-3 px-8 font-semibold rounded-2xl border-2 border-gray-200 hover:border-primary-300 transition-colors text-center"
              >
                Ask a Question
              </a>
            </motion.div>
          </motion.div>
          
          {/* Image/Illustration */}
          <motion.div 
            className="lg:w-1/2 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative w-full h-[400px] float-animation">
              <Image
                src="https://undraw.co/illustrations/undraw_environment_iaus.svg"
                alt="Youth green digital innovation illustration"
                fill
                style={{ objectFit: "contain" }}
                className="drop-shadow-xl"
              />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -z-10 top-0 right-0 w-72 h-72 bg-gradient-to-r from-primary-200/30 to-secondary-200/30 rounded-full blur-3xl"></div>
            <div className="absolute -z-10 bottom-0 left-0 w-64 h-64 bg-gradient-to-r from-primary-200/30 to-secondary-200/30 rounded-full blur-3xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 