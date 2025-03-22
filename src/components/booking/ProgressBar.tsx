import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentStep: 1 | 2 | 3;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Select Vehicle' },
    { number: 2, label: 'Personal Details' },
    { number: 3, label: 'Payment' }
  ];

  const progress = Math.max(5, ((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className="relative">
      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Animated Glow Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        </motion.div>
      </div>

      {/* Steps */}
      <div className="flex justify-between mt-4">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`flex flex-col items-center ${
              index === 0 ? 'text-left' : index === steps.length - 1 ? 'text-right' : 'text-center'
            }`}
          >
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-colors duration-300 ${
                step.number <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
              initial={{ scale: 1 }}
              animate={{ 
                scale: step.number === currentStep ? [1, 1.1, 1] : 1,
                boxShadow: step.number === currentStep 
                  ? ['0 0 0 0 rgba(37, 99, 235, 0)', '0 0 0 10px rgba(37, 99, 235, 0.1)', '0 0 0 0 rgba(37, 99, 235, 0)']
                  : 'none'
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {step.number}
            </motion.div>
            <div className="text-sm font-medium text-gray-600">{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;