'use client';

import { motion } from 'framer-motion';

interface PageBannerProps {
  subheading?: string;
  heading: string;
  description?: string;
  imageUrl?: string;
  className?: string;
  /** Shorter banner on phones (description hidden) so a form below shows sooner. */
  compactOnMobile?: boolean;
}

export default function PageBanner({
  subheading,
  heading,
  description,
  imageUrl = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070',
  className = '',
  compactOnMobile = false,
}: PageBannerProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section className={`relative ${compactOnMobile ? 'mb-4 pt-16' : 'mb-12 pt-20'} md:pt-10 md:mb-16 overflow-hidden ${className}`}>
      {/* Background Image with Overlay - Full Width */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            filter: 'grayscale(100%) brightness(0.4)',
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content - Max Width Container */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 ${compactOnMobile ? 'py-8' : 'py-16'} md:py-24`}>
        <motion.div
          className="text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {subheading && (
            <motion.p
              className="tagline text-yellow-400 text-sm md:text-base font-semibold mb-5 uppercase tracking-wider relative inline-block"
              variants={itemVariants}
            >
              {subheading}
              <span className="absolute bottom-0 left-1/2 md:left-0 transform -translate-x-full md:translate-x-0 w-1/2 h-0.5 bg-yellow-400"></span>
            </motion.p>
          )}
          <motion.h1
            className={`${compactOnMobile ? 'text-3xl mb-2' : 'text-4xl mb-6'} md:text-5xl lg:text-6xl font-bold md:mb-6 text-white`}
            variants={itemVariants}
            style={{ fontFamily: 'var(--font-nourd), sans-serif' }}
          >
            {heading}
          </motion.h1>
          {description && (
            <motion.p
              className={`text-gray-300 text-base md:text-lg max-w-3xl ${compactOnMobile ? 'hidden md:block' : ''}`}
              variants={itemVariants}
            >
              {description}
            </motion.p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

