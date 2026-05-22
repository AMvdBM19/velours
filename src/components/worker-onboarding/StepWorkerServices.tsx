'use client';

interface ServiceTag {
  id: string;
  name: string;
  description?: string;
  extra_price?: number;
  selected: boolean;
}

interface Props {
  tags: ServiceTag[];
  setTags: React.Dispatch<React.SetStateAction<ServiceTag[]>>;
  onBack: () => void;
  onNext: () => void;
}

export default function StepWorkerServices({ tags, setTags, onBack, onNext }: Props) {
  function toggleTag(tagId: string) {
    setTags(prev =>
      prev.map(t => t.id === tagId ? { ...t, selected: !t.selected } : t)
    );
  }

  const selectedCount = tags.filter(t => t.selected).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Services</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the services you offer. These tags are defined by your agency.
          You can update your selections later from your profile.
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          Your agency has not defined any service tags yet.
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <label
              key={tag.id}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                tag.selected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={tag.selected}
                onChange={() => toggleTag(tag.id)}
                className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                  {tag.extra_price != null && tag.extra_price > 0 && (
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                      +€{tag.extra_price}
                    </span>
                  )}
                </div>
                {tag.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {selectedCount} service{selectedCount !== 1 ? 's' : ''} selected
      </p>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
