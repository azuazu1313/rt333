import React from 'react';
import { Star, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Destination {
  city: string;
  country: string;
  images: {
    webp: string;
    fallback: string;
  };
  rating: number;
  reviews: string;
  flag: string;
}

const destinations: Destination[] = [
  {
    city: 'Rome',
    country: 'Italy',
    images: {
      webp: 'https://i.imghippo.com/files/LSM4166MeU.webp',
      fallback: 'https://i.imghippo.com/files/lTA7682kU.jpg'
    },
    rating: 4.9,
    reviews: '1.7k',
    flag: '🇮🇹'
  },
  {
    city: 'Paris',
    country: 'France',
    images: {
      webp: 'https://i.imghippo.com/files/cMh1488SI.webp',
      fallback: 'https://i.imghippo.com/files/IdwC2475VOg.jpg'
    },
    rating: 4.8,
    reviews: '2.2k',
    flag: '🇫🇷'
  },
  {
    city: 'Barcelona',
    country: 'Spain',
    images: {
      webp: 'https://i.imghippo.com/files/pAwd1108IE.webp',
      fallback: 'https://i.imghippo.com/files/IZqo3474CDQ.jpg'
    },
    rating: 4.9,
    reviews: '1.2k',
    flag: '🇪🇸'
  },
  {
    city: 'Milan',
    country: 'Italy',
    images: {
      webp: 'https://i.imghippo.com/files/ZQ1034aY.webp',
      fallback: 'https://i.imghippo.com/files/rLX6532WHE.jpeg'
    },
    rating: 4.7,
    reviews: '2.3k',
    flag: '🇮🇹'
  }
];

const FeaturedDestinations = () => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasPartialStar = rating % 1 !== 0;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400 fill-current"
        />
      );
    }

    // Partial star
    if (hasPartialStar) {
      const percentage = (rating % 1) * 100;
      stars.push(
        <div key="partial" className="relative w-4 h-4">
          <Star className="absolute w-4 h-4 text-gray-300" />
          <div className="absolute overflow-hidden" style={{ width: `${percentage}%` }}>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          </div>
        </div>
      );
    }

    // Empty stars
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300"
        />
      );
    }

    return stars;
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Popular Destinations</h2>
          <p className="text-lg text-gray-600">
            Go Beyond Regular Service when Travelling with Royal Transfer EU
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {destinations.map((destination, index) => (
            <Link 
              key={index}
              to={`/blogs/${destination.city.toLowerCase()}`}
              className="group relative block"
            >
              {/* Image Container */}
              <div className="relative aspect-video overflow-hidden rounded-lg">
                {/* Dark overlay - now properly visible on hover */}
                <div 
                  className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-300 z-10"
                  aria-hidden="true"
                />
                <picture>
                  <source srcSet={destination.images.webp} type="image/webp" />
                  <img
                    src={destination.images.fallback}
                    alt={`Scenic view of ${destination.city}, ${destination.country}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </picture>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  <h3 className="text-white text-3xl font-bold">{destination.city}</h3>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4">
                <h4 className="text-xl font-semibold mb-2">{destination.city}</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">{destination.flag}</span>
                    <span className="text-gray-600">{destination.country}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {renderStars(destination.rating)}
                    </div>
                    <span className="ml-2 text-gray-600">
                      {destination.rating} ({destination.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;