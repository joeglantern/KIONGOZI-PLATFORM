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
    "Green economy opportunities and sustainable business models",
    "Digital literacy and emerging technology skills",
    "Climate change adaptation and environmental innovation",
    "Renewable energy technologies and implementation",
    "Digital entrepreneurship and online market access"
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
            Empowering Kenya's youth with green economy skills and digital literacy to build
            sustainable careers and drive environmental innovation in their communities.
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
              Why Green & Digital Transition Matters
            </h3>

            <p className="text-gray-600 mb-8">
              Kenya's youth face a rapidly changing world where environmental challenges meet digital opportunities.
              By equipping young Kenyans with green economy skills and digital literacy, we create pathways to
              sustainable careers while fostering innovation that addresses climate change and drives economic growth.
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