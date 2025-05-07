"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FiCheck } from 'react-icons/fi';

const AboutSection = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const features = [
    "Understanding democratic processes in Kenya",
    "Youth roles in governance and leadership",
    "Rights and responsibilities of citizens",
    "Electoral processes and informed voting",
    "Grassroots participation and community engagement"
  ];

  return (
    <section id="about" className="py-20 px-4 gradient-bg">
      <div className="container mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            About Our <span className="gradient-text">Mission</span>
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Empowering Kenya's youth with the knowledge, tools, and platforms to actively 
            participate in democracy and foster positive change in their communities.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Image/Illustration */}
          <motion.div 
            className="lg:w-1/2 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative w-full h-[400px]">
              <Image
                src="https://undraw.co/illustrations/undraw_appreciate_it_qnkk.svg"
                alt="Youth civic engagement"
                fill
                style={{ objectFit: "contain" }}
                className="rounded-2xl"
              />
            </div>
          </motion.div>
          
          {/* Text Content */}
          <motion.div 
            className="lg:w-1/2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <h3 className="text-2xl font-bold mb-6">
              Why Civic Education Matters
            </h3>
            
            <p className="text-gray-600 mb-8">
              In a young democracy like Kenya, an informed citizenry is crucial for sustainable development 
              and good governance. We believe that by educating youth about their civic rights and 
              responsibilities, we can foster a new generation of leaders who will drive positive change.
            </p>
            
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="mt-1 bg-primary-100 rounded-full p-1 text-primary-600">
                    <FiCheck size={16} />
                  </div>
                  <p>{feature}</p>
                </motion.div>
              ))}
            </div>
            
            <motion.a 
              href="#modules"
              className="inline-block gradient-button py-3 px-8 font-semibold rounded-2xl"
              whileHover={{ y: -3 }}
              whileTap={{ y: 0 }}
            >
              Explore Our Programs
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection; 