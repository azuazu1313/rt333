import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../Header';
import Sitemap from '../Sitemap';
import Newsletter from '../Newsletter';
import BookingTopBar from './BookingTopBar';
import ProgressBar from './ProgressBar';
import { useBooking } from '../../contexts/BookingContext';

interface BookingLayoutProps {
  children: React.ReactNode;
  currentStep: 1 | 2 | 3;
  totalPrice: number;
  onBack?: () => void;
  onNext?: () => void;
  nextButtonText?: string;
  showNewsletter?: boolean;
}

const BookingLayout: React.FC<BookingLayoutProps> = ({
  children,
  currentStep,
  totalPrice,
  onBack,
  onNext,
  nextButtonText = 'Next Step',
  showNewsletter = true
}) => {
  const navigate = useNavigate();
  const { from, to, type, date, returnDate, passengers } = useParams();
  const { setBookingState } = useBooking();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStep === 1) {
      // Navigate to home with preserved parameters
      navigate(`/home/transfer/${from}/${to}/${type}/${date}/${returnDate}/${passengers}/form`);
    } else {
      // Update step in context
      setBookingState(prev => ({
        ...prev,
        step: (prev.step - 1) as 1 | 2 | 3
      }));
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      // Update step in context
      setBookingState(prev => ({
        ...prev,
        step: (prev.step + 1) as 1 | 2 | 3
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      
      <main className="pt-20 pb-32">
        {/* Content */}
        <div className="relative z-10">
          {/* Top Booking Bar */}
          <div className="mb-8 mt-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg">
                <BookingTopBar
                  from={decodeURIComponent(from || '')}
                  to={decodeURIComponent(to || '')}
                  type={type === '2' ? 'round-trip' : 'one-way'}
                  date={date || ''}
                  returnDate={returnDate}
                  passengers={passengers || '1'}
                  currentStep={currentStep}
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <ProgressBar currentStep={currentStep} />
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              {children}
            </div>
          </div>

          {/* Newsletter Section */}
          {showNewsletter && (
            <div className="mt-16">
              <Newsletter webhookUrl="https://hook.eu1.make.com/newsletter-signup" />
            </div>
          )}
        </div>

        {/* Floating Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center space-x-8">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Price</div>
                  <div className="text-xl font-bold">€{totalPrice.toFixed(2)}</div>
                </div>

                <button
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300"
                >
                  {nextButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default BookingLayout;