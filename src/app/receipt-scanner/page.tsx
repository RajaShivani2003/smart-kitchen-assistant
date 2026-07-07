'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Camera, Upload, Loader2, Sparkles, CheckCircle2, Package, X } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export const dynamic = 'force-dynamic';

function ReceiptScannerContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setImage(URL.createObjectURL(selectedFile));
    setError(null);
    setShowResult(false);
    setScannedItems([]);
    setProgress(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const groceryKeywords = [
    'sugar', 'milk', 'rice', 'flour', 'butter', 'egg', 'eggs', 'oil', 'salt',
    'tomato', 'potato', 'onion', 'garlic', 'ginger', 'chicken', 'bread',
    'cheese', 'yogurt', 'curd', 'pasta', 'noodle', 'tea', 'coffee',
    'juice', 'water', 'soda', 'fruit', 'vegetable', 'spice', 'cumin',
    'coriander', 'turmeric', 'pepper', 'cinnamon', 'honey', 'jam',
    'sauce', 'ketchup', 'mayo', 'vinegar', 'cream', 'paneer',
    'mutton', 'fish', 'shrimp', 'prawn', 'bacon', 'ham', 'sausage',
    'chip', 'cookie', 'candy', 'chocolate', 'nut', 'popcorn',
    'oat', 'cereal', 'roti', 'chapati', 'ghee',
  ];

  const parseGroceryItems = (text: string): Array<{ name: string; quantity: number; unit: string }> => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const units: Record<string, string> = {
      'kg': 'kg', 'kgs': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
      'g': 'g', 'gm': 'g', 'grams': 'g', 'gram': 'g',
      'litre': 'liters', 'liter': 'liters', 'litres': 'liters', 'liters': 'liters',
      'ml': 'ml', 'milliliter': 'ml', 'millilitre': 'ml',
      'pack': 'pack', 'packet': 'pack', 'pcs': 'pcs', 'piece': 'pcs',
      'can': 'can', 'cans': 'can', 'bottle': 'bottle', 'bottles': 'bottle',
      'dozen': 'dozen', 'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
    };

    const results: Array<{ name: string; quantity: number; unit: string }> = [];
    const seen = new Set<string>();

    for (const line of lines) {
      let matched = false;

      // Debug: log each line being tested
      console.log('Testing line:', JSON.stringify(line));

      // Pattern: "ItemName  quantity+unit" e.g. "Sugar  2kg", "Milk  1litre"
      const amountPattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s{2,}(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
      const amountMatch = line.match(amountPattern);
      if (amountMatch) {
        console.log('  -> matched amountPattern, name:', amountMatch[1]);
        const rawName = amountMatch[1].trim();
        const quantity = parseFloat(amountMatch[2]);
        const rawUnit = (amountMatch[3] || '').toLowerCase().trim();
        const unit = units[rawUnit] || 'pcs';

        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        console.log('  -> isGroceryItem:', isGroceryItem(name), 'seen:', seen.has(name.toLowerCase()));
        if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
          results.push({ name, quantity, unit });
          seen.add(name.toLowerCase());
          matched = true;
        }
      }

      // Pattern: "quantity unit ItemName" e.g. "2 kg Sugar"
      if (!matched) {
        const revPattern = /^(\d+\.?\d*)\s*([a-zA-Z]+)\s+([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)$/;
        const revMatch = line.match(revPattern);
        if (revMatch) {
          console.log('  -> matched revPattern, name:', revMatch[3]);
          const quantity = parseFloat(revMatch[1]);
          const rawUnit = revMatch[2].toLowerCase().trim();
          const rawName = revMatch[3].trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
            matched = true;
          }
        }
      }

      // Pattern: "ItemName - quantity unit" or "ItemName: quantity unit"
      if (!matched) {
        const sepPattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s*[-:]\s*(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
        const sepMatch = line.match(sepPattern);
        if (sepMatch) {
          console.log('  -> matched sepPattern, name:', sepMatch[1]);
          const rawName = sepMatch[1].trim();
          const quantity = parseFloat(sepMatch[2]);
          const rawUnit = (sepMatch[3] || '').toLowerCase().trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
            matched = true;
          }
        }
      }

      // Pattern: "ItemName quantity unit" (single space) e.g. "Sugar 2 kg"
      if (!matched) {
        const singleSpacePattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s+(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
        const singleMatch = line.match(singleSpacePattern);
        if (singleMatch) {
          console.log('  -> matched singleSpacePattern, name:', singleMatch[1]);
          const rawName = singleMatch[1].trim();
          const quantity = parseFloat(singleMatch[2]);
          const rawUnit = (singleMatch[3] || '').toLowerCase().trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
          }
        }
      }
    }

    return results;
  };

  const normalizeItemName = (name: string): string => {
    return name
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(the|a|an)\s+/i, '')
      .charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const isGroceryItem = (name: string): boolean => {
    const n = name.toLowerCase();
    if (groceryKeywords.some(k => n.includes(k))) return true;
    if (n.length < 2) return false;
    const nonGrocery = ['total', 'subtotal', 'tax', 'gst', 'amount', 'paid', 'balance', 'cash', 'card', 'change', 'receipt', 'thank', 'visit', 'store', 'shop', 'date', 'time', 'no', 'item', 'qty', 'price', 'discount', 'return', 'exchange', 'branch', 'contact', 'phone', 'email', 'website', 'www'];
    if (nonGrocery.some(w => n.includes(w)) && !groceryKeywords.some(k => n.includes(k))) return false;
    return true;
  };

  const categorizeItem = (name: string): string => {
    const n = name.toLowerCase();
    if (['tomato', 'potato', 'onion', 'garlic', 'pepper', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'chilli', 'ginger', 'leaf', 'vegetable'].some(k => n.includes(k))) return 'Vegetables';
    if (['apple', 'banana', 'orange', 'mango', 'grape', 'berry', 'fruit', 'lemon', 'lime'].some(k => n.includes(k))) return 'Fruits';
    if (['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'curd', 'paneer'].some(k => n.includes(k))) return 'Dairy';
    if (['spice', 'cumin', 'coriander', 'turmeric', 'pepper', 'cinnamon', 'cardamom', 'salt', 'sugar', 'paprika', 'oregano'].some(k => n.includes(k))) return 'Spices';
    if (['rice', 'pasta', 'bread', 'flour', 'oat', 'cereal', 'noodle', 'roti', 'chapati', 'grain'].some(k => n.includes(k))) return 'Grains';
    if (['juice', 'soda', 'water', 'tea', 'coffee', 'shake', 'smoothie', 'drink'].some(k => n.includes(k))) return 'Beverages';
    if (['chicken', 'beef', 'mutton', 'fish', 'shrimp', 'prawn', 'turkey', 'sausage', 'bacon', 'ham'].some(k => n.includes(k))) return 'Meats';
    if (['chip', 'cookie', 'cracker', 'candy', 'chocolate', 'nut', 'trail mix', 'popcorn'].some(k => n.includes(k))) return 'Snacks';
    if (['sauce', 'ketchup', 'mayo', 'olive oil', 'vinegar', 'honey', 'jam', 'pasta sauce', 'soy sauce'].some(k => n.includes(k))) return 'Condiments';
    return 'Others';
  };

  const handleScan = async () => {
    if (!file) return;

    setScanning(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: OCR in browser
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = data.text;
      console.log('OCR text:', text);
      console.log('OCR lines:', text.split(/\r?\n/).map(l => `"${l}"`));

      // Step 2: Parse grocery items
      const parsedItems = parseGroceryItems(text);
      console.log('Parsed items:', parsedItems);

      if (parsedItems.length === 0) {
        setError('Could not find any grocery items. Please try a clearer image.');
        setScanning(false);
        return;
      }

      // Step 3: Add items to database
      const itemsWithCategory = parsedItems.map(item => ({
        ...item,
        category: categorizeItem(item.name),
      }));

      for (const item of itemsWithCategory) {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      }

      setScannedItems(itemsWithCategory);
      setShowResult(true);
    } catch (err) {
      setError('OCR failed. Please try again.');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setFile(null);
    setShowResult(false);
    setScannedItems([]);
    setError(null);
    setProgress(0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/pantry" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Pantry
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Camera className="w-8 h-8 text-orange-500" />
            Receipt Scanner
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Upload a grocery receipt photo and OCR will extract items to your pantry
          </p>
        </div>

        {/* Scanner Area */}
        {!image && !showResult && (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
              dragOver
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-orange-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Camera className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Upload Receipt Photo
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Drag and drop an image, or click to browse
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-6">
              Supports JPG, PNG, WEBP (max 10MB)
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5" />
              Choose Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Image Preview */}
        {image && !showResult && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Receipt Preview</h3>
              <button
                onClick={resetScanner}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-700 mb-6">
              <img
                src={image}
                alt="Receipt"
                className="w-full max-h-96 object-contain"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            {progress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  <span>Scanning text...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning Receipt... {progress}%
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Scan Receipt
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {showResult && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {scannedItems.length} Items Added
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Items extracted from receipt and added to your pantry
                  </p>
                </div>
              </div>
              <button
                onClick={resetScanner}
                className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                <Camera className="w-4 h-4" /> Scan Another
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scannedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-full">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/pantry"
              className="block mt-6 text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              View Pantry
            </Link>
          </div>
        )}

        {/* Tips */}
        {!image && !showResult && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Tips for best results:</h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Make sure the receipt is well-lit and clearly visible</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Hold the camera straight down on the receipt</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Avoid shadows and glare on the receipt</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Include the full receipt — don't crop any items</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptScannerPage() {
  return <ReceiptScannerContent />;
}
