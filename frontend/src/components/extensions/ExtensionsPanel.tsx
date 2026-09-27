import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api/apiService';
import { ExtensionInfo } from '../../../../backend/src/services/extensions/extensions.service';

export const ExtensionsPanel: React.FC = () => {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);

  useEffect(() => {
    fetchExtensions();
  }, []);

  const fetchExtensions = async () => {
    const res = await apiService.get('/extensions');
    setExtensions(res.data.data);
  };

  const toggleExtension = async (id: string, enabled: boolean) => {
    await apiService.post(`/extensions/${id}/${enabled ? 'disable' : 'enable'}`);
    fetchExtensions();
  };

  return (
    <div className="p-4">
      <h2 className="font-bold mb-4">Extensions</h2>
      <div className="space-y-4">
        {extensions.map(ext => (
          <div key={ext.id} className="p-2 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-bold">{ext.displayName}</span>
              <button
                onClick={() => toggleExtension(ext.id, ext.enabled)}
                className={`px-2 py-1 rounded text-xs ${ext.enabled ? 'bg-red-600' : 'bg-green-600'}`}
              >
                {ext.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            <p className="text-xs text-gray-400">{ext.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
