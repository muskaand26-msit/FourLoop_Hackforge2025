import React, { useState, useEffect } from 'react';
import { Droplet, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BloodBank {
  id: string;
  name: string;
}

interface InventoryData {
  blood_type: string;
  total_units: number;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function BloodInventoryDisplay() {
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBloodBanks();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedBank]);

  const fetchBloodBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_banks')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setBloodBanks(data || []);
    } catch (error) {
      console.error('Error fetching blood banks:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blood_inventory')
        .select('blood_type, units_available');

      if (selectedBank !== 'all') {
        query = query.eq('blood_bank_id', selectedBank);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate inventory data
      const aggregatedData = BLOOD_TYPES.map(type => {
        const totalUnits = data
          ?.filter(item => item.blood_type === type)
          .reduce((sum, item) => sum + (item.units_available || 0), 0);

        return {
          blood_type: type,
          total_units: totalUnits
        };
      });

      setInventory(aggregatedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Blood Units</h2>
        <div className="flex items-center">
          <Building2 className="h-5 w-5 text-gray-400 mr-2" />
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="all">All Blood Banks</option>
            {bloodBanks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {inventory.map((item) => (
          <div
            key={item.blood_type}
            className="bg-red-50 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Droplet className="h-6 w-6 text-red-500 mr-2" />
              <span className="text-lg font-semibold">{item.blood_type}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{item.total_units}</div>
              <div className="text-sm text-gray-500">units</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}