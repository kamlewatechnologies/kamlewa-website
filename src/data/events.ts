export interface EventParticipant {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
  type: 'featured' | 'upcoming';
  participants?: number;
  feedback?: number;
  hours?: number;
  summary?: string;
  // Registration features
  maxParticipants?: number;
  registeredParticipants?: EventParticipant[];
  registeredCount?: number;
  registrationOpen?: boolean;
  startTime?: string; // ISO format: "2024-03-15T09:00:00"
  endTime?: string; // ISO format: "2024-03-15T17:00:00"
  shareLink?: string;
}

export const featuredEventsData: Event[] = [
  {
    id: '1',
    title: 'Cybersecurity Awareness Workshop 2024',
    description: 'A comprehensive workshop covering essential cybersecurity practices for individuals and small businesses.',
    date: 'March 15, 2024',
    location: 'Yaoundé, Cameroon',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071',
    type: 'featured',
    participants: 150,
    feedback: 95,
    hours: 40,
    summary: 'A comprehensive workshop covering essential cybersecurity practices for individuals and small businesses, with hands-on training and real-world case studies.',
    maxParticipants: 200,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2024-03-15T09:00:00',
    endTime: '2024-03-15T17:00:00',
    shareLink: '',
  },
  {
    id: '2',
    title: 'Digital Skills Bootcamp',
    description: 'Intensive training program designed to equip participants with essential digital skills for the modern workplace.',
    date: 'April 10, 2024',
    location: 'Douala, Cameroon',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070',
    type: 'featured',
    participants: 200,
    feedback: 92,
    hours: 60,
    summary: 'Intensive training program designed to equip participants with essential digital skills for the modern workplace, including productivity tools and cloud computing.',
    maxParticipants: 150,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2024-04-10T08:00:00',
    endTime: '2024-04-10T18:00:00',
    shareLink: '',
  },
  {
    id: '3',
    title: 'STEAM Education Summit',
    description: 'Bringing together educators and students to explore innovative approaches to STEAM education.',
    date: 'May 5, 2024',
    location: 'Buea, Cameroon',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070',
    type: 'featured',
    participants: 300,
    feedback: 98,
    hours: 80,
    summary: 'Bringing together educators and students to explore innovative approaches to STEAM education, featuring interactive sessions and collaborative projects.',
    maxParticipants: 400,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2024-05-05T09:00:00',
    endTime: '2024-05-05T17:00:00',
    shareLink: '',
  },
  {
    id: '4',
    title: 'Tech Startup Pitch Day',
    description: 'A platform for tech entrepreneurs to showcase their innovative ideas and connect with investors.',
    date: 'June 20, 2024',
    location: 'Yaoundé, Cameroon',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070',
    type: 'featured',
    participants: 75,
    feedback: 90,
    hours: 30,
    summary: 'A platform for tech entrepreneurs to showcase their innovative ideas, connect with investors, and receive valuable feedback from industry experts.',
    maxParticipants: 100,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2024-06-20T10:00:00',
    endTime: '2024-06-20T16:00:00',
    shareLink: '',
  },
];

export const upcomingEventsData: Event[] = [
  {
    id: '5',
    title: 'Advanced Cybersecurity Training',
    description: 'Join us for an intensive cybersecurity training session covering advanced threat detection and prevention techniques.',
    date: 'January 25, 2025',
    location: 'Yaoundé, Cameroon',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070',
    type: 'upcoming',
    maxParticipants: 80,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2025-01-25T09:00:00',
    endTime: '2025-01-25T17:00:00',
    shareLink: '',
  },
  {
    id: '6',
    title: 'Digital Innovation Summit',
    description: 'Explore the latest trends in digital innovation and technology at our annual summit.',
    date: 'February 15, 2025',
    location: 'Douala, Cameroon',
    image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=2070',
    type: 'upcoming',
    maxParticipants: 250,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2025-02-15T08:30:00',
    endTime: '2025-02-15T18:00:00',
    shareLink: '',
  },
  {
    id: '7',
    title: 'Women in Tech Conference',
    description: 'Celebrating and empowering women in technology through networking and knowledge sharing.',
    date: 'March 8, 2025',
    location: 'Buea, Cameroon',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071',
    type: 'upcoming',
    maxParticipants: 300,
    registeredParticipants: [],
    registrationOpen: true,
    startTime: '2025-03-08T09:00:00',
    endTime: '2025-03-08T17:00:00',
    shareLink: '',
  },
];

