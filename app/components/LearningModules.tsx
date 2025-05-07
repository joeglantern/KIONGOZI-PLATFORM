"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiBook, FiUsers, FiCheckSquare, FiClipboard } from 'react-icons/fi';

const LearningModules = () => {
  const modules = [
    {
      icon: <FiCheckSquare size={24} />,
      title: "Why Voting Matters",
      description: "Understand the importance of voting, how it shapes policy, and its impact on communities.",
      topics: ["Power of a Single Vote", "Historical Perspective", "Case Studies from Kenya"],
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: <FiBook size={24} />,
      title: "How Elections Work in Kenya",
      description: "Learn about Kenya's electoral system, the role of the IEBC, and election integrity.",
      topics: ["Electoral Structure", "Voting Process", "Results Verification"],
      color: "from-teal-500 to-green-500"
    },
    {
      icon: <FiUsers size={24} />,
      title: "Youth in Leadership",
      description: "Explore opportunities for youth to participate in leadership at community and national levels.",
      topics: ["Youth Representation", "Advocacy Skills", "Success Stories"],
      color: "from-orange-500 to-pink-500"
    },
    {
      icon: <FiClipboard size={24} />,
      title: "IEBC Education",
      description: "Learn about the Independent Electoral and Boundaries Commission and its role in Kenya's democracy.",
      topics: ["IEBC Structure", "Electoral Boundaries", "Election Management", "Voter Education"],
      color: "from-purple-500 to-indigo-500"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const moduleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <section id="modules" className="py-20 px-4">
      <div className="container mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Learning <span className="gradient-text">Modules</span>
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Our interactive learning modules are designed to make civic education engaging and 
            relevant for young Kenyans. Explore topics essential for active citizenship.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {modules.map((module, index) => (
            <motion.div 
              key={index}
              className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              variants={moduleVariants}
            >
              <div className={`bg-gradient-to-r ${module.color} p-6 text-white`}>
                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  {module.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                <p className="text-white/90">{module.description}</p>
              </div>
              
              <div className="p-6">
                <h4 className="font-semibold mb-3 text-gray-700">Key Topics:</h4>
                <ul className="space-y-2 mb-6">
                  {module.topics.map((topic, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                      {topic}
                    </li>
                  ))}
                </ul>
                
                <a 
                  href="#" 
                  className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700"
                >
                  Learn more <FiArrowRight className="ml-2" />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <a 
            href="#ask-ai" 
            className="gradient-button py-3 px-8 font-semibold rounded-2xl inline-block"
          >
            Have Questions? Ask Our AI
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default LearningModules; 