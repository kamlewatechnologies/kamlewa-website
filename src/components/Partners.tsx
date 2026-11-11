'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import Image from 'next/image';

export default function Partners({ className }: { className?: string } ) {
  const t = useTranslations('partners');

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

  // Partner logos mapping
  const partners = [
    {
      name: 'Google',
      logo: '/images/partners/google-2015-new-seeklogo.png',
    },
    {
      name: 'Canva',
      logo: '/images/partners/canva-seeklogo.png',
    },
    {
      name: 'Slack',
      logo: '/images/partners/Slack_RGB_White.png',
    },
    {
      name: 'Certopus',
      logo: '/images/partners/certopus.svg',
    },
    {
      name: 'London School of Cyber Security',
      logo: '/images/partners/university_of_london.svg',
    },
    {
      name: 'Women In Cybersecurity Middle East',
      logo: '/images/partners/middle-east.png',
    },
    {
      name: 'Hack The Box',
      logo: '/images/partners/hackthebox.png',
    },
    {
      name: 'UNDP',
      logo: '/images/partners/undp-seeklogo.png',
    },
    {
      name: 'ANTIC',
      logo: '/images/partners/ANTIC.png',
    },
    {
      name: 'University of Buea',
      logo: '/images/partners/University-of-Buea_logo.png',
    },
    {
      name: 'TAH News Network',
      logo: '/images/partners/tah news network.jpg',
    },
    
   
    {
      name: 'OIC',
      logo: '/images/partners/oic_logo.png',
    },
    {
      name: 'Nervtek',
      logo: '/images/partners/nervtek_logo.png',
    },
    {
      name: 'Mboa Digital',
      logo: '/images/partners/mboa digital.png',
    },
    {
      name: 'Logo UDs',
      logo: '/images/partners/Logo_UDs.png',
    },
    {
      name: 'Katika',
      logo: '/images/partners/katika.jpg',
    },
    {
      name: 'Jongo',
      logo: '/images/partners/jongo.jpg',
    },
    {
      name: 'IUC',
      logo: '/images/partners/iuc.jpg',
    },
    {
      name: 'Kamcyber',
      logo: '/images/partners/kamcyber.jpg',
    },
    {
      name: 'CYNC',
      logo: '/images/partners/CYNC.jpg',
    },
    {
      name: 'Codam Technologies',
      logo: '/images/partners/codam_techologies_logo.jpg',
    },
    {
      name: 'Codec',
      logo: '/images/partners/codec.jpg',
    },
    {
      name: 'Activspaces',
      logo: '/images/partners/activspaces_logo.jpg',
    },
    {
      name: 'AC',
      logo: '/images/partners/AC.png',
    },
    {
      name: 'CITs',
      logo: '/images/partners/CITs.png',
    },
    {
      name: 'JFN',
      logo: '/images/partners/logo-jfn.png',
    },
    {
      name: 'OWASP',
      logo: '/images/partners/owasp_logo.png',
    },
  ];

  // Duplicate partners for seamless loop
  const duplicatedPartners = [...partners, ...partners, ...partners];

  return (
    <section className="bg-black text-white py-4 md:py-10 border-y border-white/5">

      <div className={`max-w-5xl mx-auto px-6 md:px-12 lg:px-16 ${className}`}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Section Header */}
          <motion.div className="text-start mb-4 md:mb-8" variants={itemVariants}>
            <motion.p
              className="tagline text-yellow-400 text-sm md:text-base font-semibold mb-5 uppercase tracking-wider relative inline-block"
              variants={itemVariants}
            >
              {t('heading')}
              <span className="absolute bottom-0 left-1/2 transform -translate-x-full w-1/2 h-0.5 bg-yellow-400"></span>
            </motion.p>
          </motion.div>

          {/* Partners Carousel */}
          <motion.div variants={itemVariants} className="relative overflow-hidden">
            {/* Gradient fade on left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-r from-black via-black/80 to-transparent pointer-events-none z-10"></div>
            
            {/* linear fade on right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-l from-black via-black/80 to-transparent pointer-events-none z-10"></div>
            
            <Swiper
              modules={[Autoplay]}
              spaceBetween={30}
              slidesPerView="auto"
              autoplay={{
                delay: 0,
                disableOnInteraction: false,
              }}
              speed={5000}
              loop={true}
              allowTouchMove={false}
              className="partners-text-swiper"
              breakpoints={{
                768: {
                  spaceBetween: 50,
                },
              }}
            >
              {duplicatedPartners.map((partner, index) => (
                <SwiperSlide key={index} style={{ width: 'auto' }}>
                  <div className="flex items-center justify-center px-3 md:px-6 h-12 md:h-20">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={200}
                      height={80}
                      className="object-contain h-full w-auto max-w-[100px] md:max-w-[180px] rounded-sm opacity-90 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
