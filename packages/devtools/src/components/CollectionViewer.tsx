import { useState } from 'react';
import { Document } from '@nebulus/core';
import ReactJson from 'react-json-view';

interface CollectionViewerProps {
  name: string;
  documents: Document[];
  indexes?: any[];
  schemaVersion?: number;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
}

export function CollectionViewer({ name, documents, indexes = [], schemaVersion, onEdit, onDelete }: CollectionViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  // Filter documents based on search term
  const filteredDocs = documents.filter(doc => {
    if (!searchTerm) return true;
    
    // Convert document to string and search
    const docString = JSON.stringify(doc).toLowerCase();
    return docString.includes(searchTerm.toLowerCase());
  });
  
  // Sort documents
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    const aValue = getNestedValue(a, sortField);
    const bValue = getNestedValue(b, sortField);
    
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Get value from nested path (e.g. 'user.name')
  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
  }
  
  // Toggle sort direction or change sort field
  function handleSort(field: string) {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }
  
  // Get all fields from documents
  const allFields = new Set<string>();
  documents.forEach(doc => {
    Object.keys(doc).forEach(key => {
      allFields.add(key);
    });
  });
  
  // Convert to array and ensure 'id' is first
  const fields = Array.from(allFields);
  if (fields.includes('id')) {
    fields.splice(fields.indexOf('id'), 1);
    fields.unshift('id');
  }
  
  return (
    <div className="bg-white dark:bg-nebulus-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-nebulus-700">
        <h2 className="text-lg font-semibold text-nebulus-900 dark:text-white">{name}</h2>
        <p className="text-sm text-nebulus-600 dark:text-nebulus-400">{documents.length} documents</p>
        {typeof schemaVersion === 'number' && (
          <p className="text-xs text-nebulus-500 dark:text-nebulus-400 mt-1">Schema Version: {schemaVersion}</p>
        )}
        {indexes.length > 0 && (
          <div className="mt-2">
            <span className="text-xs font-semibold text-nebulus-700 dark:text-nebulus-300">Indexes:</span>
            <ul className="text-xs text-nebulus-600 dark:text-nebulus-400 ml-2">
              {indexes.map((idx, i) => (
                <li key={i}>{idx.name} ({idx.type}): [{idx.fields.join(', ')}]</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-nebulus-700">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebulus-700 dark:border-nebulus-600 dark:text-white"
        />
      </div>
      
      <div className="flex">
        {/* Document list */}
        <div className="w-1/2 overflow-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-nebulus-700">
            <thead className="bg-gray-50 dark:bg-nebulus-700">
              <tr>
                {fields.slice(0, 3).map(field => (
                  <th
                    key={field}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-nebulus-300"
                    onClick={() => handleSort(field)}
                  >
                    {field}
                    {sortField === field && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-nebulus-800 dark:divide-nebulus-700">
              {sortedDocs.map(doc => (
                <tr 
                  key={doc.id} 
                  className={`hover:bg-gray-100 dark:hover:bg-nebulus-700 cursor-pointer ${
                    selectedDoc?.id === doc.id ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' : ''
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  {fields.slice(0, 3).map(field => (
                    <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-nebulus-200">
                      {typeof doc[field] === 'object' 
                        ? JSON.stringify(doc[field]).substring(0, 30) + '...'
                        : String(doc[field] ?? '').substring(0, 30)}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(doc);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Document viewer */}
        <div className="w-1/2 border-l border-gray-200 dark:border-nebulus-700 p-4 overflow-auto" style={{ maxHeight: '500px' }}>
          {selectedDoc ? (
            <ReactJson 
              src={selectedDoc} 
              name={null} 
              theme={document.documentElement.classList.contains('dark') ? 'monokai' : 'rjv-default'} 
              displayDataTypes={false}
              enableClipboard={true}
              collapsed={1}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-nebulus-500 dark:text-nebulus-400">
              Select a document to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
