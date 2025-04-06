import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Droplet, RefreshCw } from 'lucide-react';
import { inventoryUpdateSchema, type InventoryUpdateData } from '../lib/validation';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface BloodInventory {
  id: string;
  blood_type: string;
  units_available: number;
  last_updated: string;
}

interface BloodInventoryManagerProps {
  bloodBankId: string;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function BloodInventoryManager({ bloodBankId }: BloodInventoryManagerProps) {
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryUpdateData>({
    resolver: zodResolver(inventoryUpdateSchema),
  });

  useEffect(() => {
    fetchInventory();
  }, [bloodBankId]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_inventory')
        .select('*')
        .eq('blood_bank_id', bloodBankId)
        .order('blood_type');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: InventoryUpdateData) => {
    try {
      const updates = Object.entries(data).map(([blood_type, units_available]) => ({
        blood_bank_id: bloodBankId,
        blood_type,
        units_available: parseInt(units_available.toString()),
        last_updated: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('blood_inventory')
        .upsert(updates, { onConflict: 'blood_bank_id,blood_type' });

      if (error) throw error;

      toast.success('Inventory updated successfully');
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 text-red-500 animate-spin mx-auto" />
        <p className="mt-2 text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BLOOD_TYPES.map((type) => {
          const currentInventory = inventory.find((i) => i.blood_type === type);
          return (
            <div
              key={type}
              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Droplet className="h-5 w-5 text-red-500 mr-2" />
                  <span className="font-semibold">{type}</span>
                </div>
                <span className="text-sm text-gray-500">
                  Current: {currentInventory?.units_available || 0} units
                </span>
              </div>
              <input
                type="number"
                {...register(type as keyof InventoryUpdateData)}
                defaultValue={currentInventory?.units_available || 0}
                min="0"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              {errors[type as keyof InventoryUpdateData] && (
                <p className="mt-1 text-sm text-red-500">
                  {errors[type as keyof InventoryUpdateData]?.message}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Updating...' : 'Update Inventory'}
        </button>
      </div>
    </form>
  );
}