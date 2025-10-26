
import { Product } from '../types';

export const MOCK_PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'NVIDIA GeForce RTX 4090',
        category: 'GPU',
        imageUrl: 'https://picsum.photos/seed/rtx4090/600/400',
        price: '$1599.99',
        affiliateLink: 'https://www.amazon.com/dp/B0BGH614C3?tag=youraffiliate-20',
        review: 'The RTX 4090 is an absolute monster of a GPU, delivering unparalleled performance for 4K gaming and creative workloads. Its DLSS 3 technology is a game-changer, providing massive frame rate boosts with stunning image quality. If you want the best of the best, this is it.',
        specifications: 'VRAM: 24GB GDDR6X, Boost Clock: 2.52 GHz, CUDA Cores: 16384, Interface: PCIe 4.0'
    },
    {
        id: '2',
        name: 'AMD Ryzen 9 7950X',
        category: 'CPU',
        imageUrl: 'https://picsum.photos/seed/ryzen7950x/600/400',
        price: '$699.00',
        affiliateLink: 'https://www.amazon.com/dp/B0BBJ58L8J?tag=youraffiliate-20',
        review: 'The AMD Ryzen 9 7950X is a productivity powerhouse. With 16 cores and 32 threads, it chews through rendering, encoding, and compilation tasks with ease. It\'s also a fantastic gaming CPU, making it the perfect choice for a no-compromise build.',
        specifications: 'Cores: 16, Threads: 32, Max Boost Clock: 5.7 GHz, L3 Cache: 64MB, Socket: AM5'
    },
    {
        id: '3',
        name: 'Corsair Vengeance RGB 32GB DDR5',
        category: 'RAM',
        imageUrl: 'https://picsum.photos/seed/corsairram/600/400',
        price: '$124.99',
        affiliateLink: 'https://www.amazon.com/dp/B0BPTKD787?tag=youraffiliate-20',
        review: 'This 32GB kit of Corsair Vengeance DDR5 RAM offers a perfect blend of high speed and stunning RGB lighting. It provides more than enough capacity for modern gaming and multitasking, ensuring a smooth and responsive system.',
        specifications: 'Capacity: 32GB (2 x 16GB), Type: DDR5, Speed: 6000MHz, CAS Latency: 36'
    },
    {
        id: '4',
        name: 'Samsung 990 Pro 2TB NVMe SSD',
        category: 'Storage',
        imageUrl: 'https://picsum.photos/seed/samsung990/600/400',
        price: '$169.99',
        affiliateLink: 'https://www.amazon.com/dp/B0B9C24168?tag=youraffiliate-20',
        review: 'Experience lightning-fast load times with the Samsung 990 Pro. As one of the fastest PCIe 4.0 SSDs on the market, it dramatically reduces game loading screens and speeds up file transfers, making it an essential component for any high-end PC.',
        specifications: 'Capacity: 2TB, Interface: PCIe 4.0 NVMe, Read Speed: 7450 MB/s, Write Speed: 6900 MB/s'
    }
];
