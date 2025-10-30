// In a real application, this would be a securely stored environment variable.
export const ADMIN_PASSWORD = 'admin';

export const FALLBACK_IMAGE_URL = 'https://placehold.co/600x400/1a202c/4fd1c5/png?text=Image+Not+Found';

export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
export const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Canonical category taxonomy
export const CATEGORY_GROUPS: { name: string; categories: string[] }[] = [
    {
        name: 'Core Components',
        categories: [
            'CPU',
            'CPU Cooler',
            'Motherboard',
            'GPU',
            'RAM',
            'Storage',
            'Power Supply',
            'Case',
            'Case Fan',
            'Thermal Paste',
        ],
    },
    {
        name: 'Peripherals',
        categories: [
            'Monitor',
            'Keyboard',
            'Mouse',
            'Headset',
            'Speakers',
            'Microphone',
            'Webcam',
            'Mouse Pad',
            'Controller',
        ],
    },
    {
        name: 'Networking',
        categories: [
            'Router',
            'Switch',
            'Wi‑Fi Adapter',
            'Ethernet Card',
        ],
    },
    {
        name: 'Accessories',
        categories: [
            'Capture Card',
            'USB Hub',
            'SD Card Reader',
            'RGB Controller',
            'Cables',
        ],
    },
];

export const ALL_CATEGORIES: string[] = Array.from(new Set(CATEGORY_GROUPS.flatMap(g => g.categories)));

// Amazon Associates tags (configure yours here or via env at build time)
export const AMAZON_TAG_US = (process.env.REACT_APP_AMAZON_TAG_US || 'rigrater-20').trim();
export const AMAZON_TAG_UK = (process.env.REACT_APP_AMAZON_TAG_UK || 'rigrater-21').trim();