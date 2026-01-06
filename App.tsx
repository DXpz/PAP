
import React, { useState, useEffect } from 'react';
import { ActionPortal } from './components/ActionPortal';
import { AnimatedBackground } from './components/AnimatedBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 md:p-12 transition-colors duration-700 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <AnimatedBackground theme={theme} />
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className={`fixed top-8 right-8 z-50 p-3 rounded-full shadow-2xl transition-all duration-300 ${theme === 'dark' ? 'bg-white text-black hover:bg-[#E60000] hover:text-white' : 'bg-black text-white hover:bg-[#E60000]'}`}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <AnimatePresence>
        {isLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full flex justify-center"
          >
            <ActionPortal theme={theme} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
