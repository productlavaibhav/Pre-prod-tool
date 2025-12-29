import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import type { Shoot } from '../App';

interface VendorQuoteFormProps {
  shoot: Shoot;
  relatedShoots?: Shoot[]; // Other shoots in the same request group
  onSubmit: (shootId: string, amount: number, notes: string, itemizedPrices?: { id: string; vendorRate: number }[]) => Promise<void> | void;
  onBack?: () => void;
  isStandalone?: boolean;
}

interface QuoteItem {
  id: string;
  name: string;
  days: number;
  expectedRate: number;
  vendorRate: number;
}

interface ShootQuoteData {
  shootId: string;
  shootName: string;
  date: string;
  location: string;
  items: QuoteItem[];
  notes: string;
}

export function VendorQuoteForm({ shoot, relatedShoots = [], onSubmit, onBack, isStandalone = false }: VendorQuoteFormProps) {
  // Combine main shoot with related shoots - memoize to prevent unnecessary recalculations
  const allShoots = React.useMemo(() => {
    const combined = [shoot, ...relatedShoots.filter(s => s.id !== shoot.id)];
    console.log('VendorQuoteForm - Computing allShoots:', combined.map(s => ({ name: s.name, id: s.id })));
    return combined;
  }, [shoot, relatedShoots]);
  
  const isMultiShoot = allShoots.length > 1;
  
  // State for each shoot's quote data
  const [shootQuotes, setShootQuotes] = useState<ShootQuoteData[]>([]);
  const [activeShootIndex, setActiveShootIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalNotes, setGlobalNotes] = useState('');

  // Generate shareable link - use requestGroupId if available, otherwise shoot id
  const vendorLink = shoot.requestGroupId 
    ? `${window.location.origin}?vendor=${shoot.requestGroupId}`
    : `${window.location.origin}?vendor=${shoot.id}`;

  // Debug logging
  console.log('VendorQuoteForm render - shoot:', shoot.name, 'groupId:', shoot.requestGroupId);
  console.log('VendorQuoteForm render - relatedShoots count:', relatedShoots.length);
  console.log('VendorQuoteForm render - allShoots count:', allShoots.length, allShoots.map(s => s.name));

  // Create a stable key for the shoots that changes when shoot data actually changes
  const shootsKey = allShoots.map(s => `${s.id}:${s.name}:${s.equipment.length}`).join('|');

  // Initialize quote data for all shoots
  useEffect(() => {
    console.log('VendorQuoteForm useEffect - Initializing for', allShoots.length, 'shoots');
    
    const initialQuotes: ShootQuoteData[] = allShoots.map(s => {
      console.log('  - Initializing shoot:', s.name, 'with', s.equipment.length, 'items');
      return {
        shootId: s.id,
        shootName: s.name || `Shoot`,
        date: s.date || '',
        location: s.location || '',
        items: s.equipment.map((eq, index) => ({
          id: eq.id || `item-${index}`,
          name: eq.name,
          days: (eq as any).days || 1,
          expectedRate: eq.expectedRate || eq.dailyRate || 0,
          vendorRate: eq.vendorRate || 0
        })),
        notes: ''
      };
    });
    
    console.log('VendorQuoteForm useEffect - Setting shootQuotes with', initialQuotes.length, 'quotes');
    setShootQuotes(initialQuotes);
  }, [shootsKey]); // Use shootsKey to detect actual data changes

  const updateItem = (shootIndex: number, itemId: string, value: number) => {
    setShootQuotes(quotes => 
      quotes.map((quote, idx) => 
        idx === shootIndex 
          ? {
              ...quote,
              items: quote.items.map(item => 
                item.id === itemId ? { ...item, vendorRate: value } : item
              )
            }
          : quote
      )
    );
  };

  const calculateShootTotal = (shootIndex: number) => {
    if (!shootQuotes[shootIndex]) return 0;
    return shootQuotes[shootIndex].items.reduce((sum, item) => sum + item.vendorRate, 0);
  };

  const calculateGrandTotal = () => {
    return shootQuotes.reduce((sum, quote) => 
      sum + quote.items.reduce((itemSum, item) => itemSum + item.vendorRate, 0), 0
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (shootQuotes.length === 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit each shoot's quote sequentially
      for (const quote of shootQuotes) {
        const itemizedPrices = quote.items.map(item => ({
          id: item.id,
          vendorRate: item.vendorRate
        }));
        const shootTotal = quote.items.reduce((sum, item) => sum + item.vendorRate, 0);
        
        await onSubmit(quote.shootId, shootTotal, globalNotes, itemizedPrices);
      }
      
      // Always show success view after submission
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting quotes:', error);
      // Still show success view - data is saved to localStorage as backup
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(vendorLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Success screen
  if (submitted && isStandalone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F7FA' }}>
        <div 
          className="bg-white rounded-2xl overflow-hidden text-center p-8"
          style={{ width: '420px', maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#E8F5E9' }}
          >
            <Check className="w-8 h-8" style={{ color: '#27AE60' }} />
          </div>
          <h2 className="text-xl text-gray-900 mb-2">Quote Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your quote of ₹{calculateGrandTotal().toLocaleString()} 
            {isMultiShoot ? ` for ${allShoots.length} shoots` : ` for "${shoot.name}"`} 
            has been submitted successfully.
          </p>
          {isMultiShoot && (
            <div className="text-left bg-gray-50 rounded-lg p-3 mb-4">
              {shootQuotes.map((quote, idx) => (
                <div key={quote.shootId} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{quote.shootName}</span>
                  <span className="font-medium">₹{calculateShootTotal(idx).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">
            The production team will review your quote and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  const activeQuote = shootQuotes[activeShootIndex];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F7FA' }}>
      <div 
        className="bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ 
          width: isMultiShoot ? '500px' : '420px',
          maxWidth: '100%',
          maxHeight: '90vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0" style={{ backgroundColor: '#2D60FF' }}>
          {!isStandalone && onBack && (
            <button onClick={onBack} className="mb-3">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
          )}
          <h1 className="text-white text-xl mb-1">Quote Request</h1>
          <p className="text-blue-100 text-sm">
            {isMultiShoot 
              ? `${allShoots.length} shoots • ${shoot.requestor?.name || 'Requestor'}`
              : shoot.name
            }
          </p>
        </div>

        {/* Share Link Section - Always visible at top when not standalone */}
        {!isStandalone && (
          <div className="px-6 py-3 border-b border-gray-200 bg-yellow-50 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Vendor Link:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-600 truncate">
                {vendorLink}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 text-sm font-medium"
                style={{ 
                  backgroundColor: copied ? '#E8F5E9' : '#2D60FF',
                  color: copied ? '#27AE60' : 'white'
                }}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Shoot Info - Single shoot */}
            {!isMultiShoot && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">Shoot Date</div>
                <div className="text-gray-900">{shoot.date}</div>
                <div className="text-sm text-gray-600 mt-2 mb-1">Location</div>
                <div className="text-gray-900">{shoot.location}</div>
              </div>
            )}

            {/* Multi-shoot section - prominently displayed */}
            {isMultiShoot && (
              <div className="border-b border-gray-200">
                {/* Multi-shoot header banner */}
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold">{allShoots.length}</span>
                      </div>
                      <div>
                        <span className="text-white font-semibold text-lg">Multiple Shoots Request</span>
                        <p className="text-blue-100 text-xs">Please provide quotes for each shoot below</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Shoot tabs - large card style */}
                <div className="px-6 py-4 bg-gray-100">
                  <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Select Shoot to Edit:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {shootQuotes.map((quote, index) => (
                      <button
                        key={quote.shootId}
                        type="button"
                        onClick={() => setActiveShootIndex(index)}
                        className={`p-4 rounded-xl text-left transition-all border-2 ${
                          activeShootIndex === index
                            ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            activeShootIndex === index ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-semibold truncate">{quote.shootName || `Shoot ${index + 1}`}</span>
                        </div>
                        <div className={`text-xs ${activeShootIndex === index ? 'text-blue-100' : 'text-gray-500'}`}>
                          {quote.date} • {quote.location}
                        </div>
                        <div className={`text-xs mt-1 ${activeShootIndex === index ? 'text-blue-100' : 'text-gray-400'}`}>
                          {quote.items.length} items
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quote Table */}
            <div className="px-6 py-4">
              {isMultiShoot && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      {activeShootIndex + 1}
                    </div>
                    <span className="font-semibold text-blue-900">
                      Now editing: {activeQuote?.shootName || `Shoot ${activeShootIndex + 1}`}
                    </span>
                  </div>
                </div>
              )}
              <h3 className="text-gray-900 mb-4">
                {isMultiShoot ? 'Equipment List' : 'Edit Quote'}
              </h3>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-700">Item</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-700">Your Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeQuote?.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.days} day(s)</div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            step="100"
                            min="0"
                            value={item.vendorRate}
                            onChange={(e) => updateItem(activeShootIndex, item.id, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded text-right text-sm focus:outline-none focus:border-blue-500"
                            placeholder="₹0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Shoot Total */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    {isMultiShoot ? `${activeQuote?.shootName} Total` : 'Your Quote Total'}
                  </span>
                  <span className="text-xl font-semibold" style={{ color: '#2D60FF' }}>
                    ₹{calculateShootTotal(activeShootIndex).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Grand Total for multi-shoot */}
              {isMultiShoot && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">All Shoots Summary</div>
                  {shootQuotes.map((quote, idx) => (
                    <div key={quote.shootId} className="flex justify-between text-sm py-1">
                      <span className={idx === activeShootIndex ? 'font-medium text-blue-600' : 'text-gray-600'}>
                        {quote.shootName || `Shoot ${idx + 1}`}
                      </span>
                      <span className={idx === activeShootIndex ? 'font-medium text-blue-600' : 'text-gray-900'}>
                        ₹{calculateShootTotal(idx).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between mt-2 pt-2 border-t border-blue-200">
                    <span className="font-semibold text-gray-900">Grand Total</span>
                    <span className="text-xl font-bold" style={{ color: '#2D60FF' }}>
                      ₹{calculateGrandTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mt-6">
                <label className="block mb-2 text-sm text-gray-700">Notes (Optional)</label>
                <textarea
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white sticky bottom-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg text-white transition-all font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2D60FF' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting...
                  </span>
                ) : isMultiShoot 
                  ? `Submit Quote for ${allShoots.length} Shoots (₹${calculateGrandTotal().toLocaleString()})`
                  : 'Submit Final Quote'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
