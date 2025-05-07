"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';
import Image from 'next/image';

const ImpactSection = () => {
  const testimonials = [
    {
      name: "Amina Wanjiku",
      location: "Nairobi County",
      quote: "This platform helped me understand the importance of my vote and how local governance affects my community. I've now joined a youth council in my area!",
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      stars: 5
    },
    {
      name: "Daniel Ochieng",
      location: "Kisumu County",
      quote: "I used to think politics wasn't for young people like me. Thanks to this civic education, I now know how to engage with my representatives and advocate for youth issues.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      stars: 5
    },
    {
      name: "Faith Mwangi",
      location: "Mombasa County",
      quote: "The AI assistant answered all my questions about voter registration. The learning modules are engaging and relevant to young Kenyans who want to make a difference.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      stars: 5
    }
  ];

  const stats = [
    { number: "15,000+", label: "Youth Engaged" },
    { number: "47", label: "Counties Reached" },
    { number: "85%", label: "Increased Civic Knowledge" }
  ];

  return (
    <section id="impact" className="py-20 px-4">
      <div className="container mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our <span className="gradient-text">Impact</span>
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            See how our civic education platform is transforming how Kenyan youth 
            engage with democracy and governance in their communities.
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-3xl shadow-lg text-center gradient-bg border border-gray-100"
            >
              <h3 className="text-4xl font-bold gradient-text mb-2">{stat.number}</h3>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <h3 className="text-2xl font-bold text-center mb-8">Testimonials from Youth</h3>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index}
              className="bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    fill
                    sizes="48px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
              
              <div className="flex mb-4">
                {[...Array(testimonial.stars)].map((_, i) => (
                  <FiStar key={i} className="text-yellow-400 fill-current" />
                ))}
              </div>
              
              <p className="text-gray-600 italic">"{testimonial.quote}"</p>
            </motion.div>
          ))}
        </div>

        {/* Partners Section */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-2xl font-bold text-center mb-8">Our Partners</h3>
          
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-70">
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-gray-500">UNDP</div>
            </div>
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-gray-500">IEBC</div>
            </div>
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-gray-500">UNESCO</div>
            </div>
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-gray-500">Youth Gov</div>
            </div>
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-gray-500">Digital Kenya</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactSection; 