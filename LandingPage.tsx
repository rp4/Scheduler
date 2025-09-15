import { useState, ReactNode } from 'react';
import { Info } from 'lucide-react';

export interface LandingPageConfig {
  // Main content
  icon?: string | ReactNode;
  title: string;
  subtitle: string;

  // Privacy/info popup
  showInfoButton?: boolean;
  infoPopup?: {
    title: string;
    icon?: ReactNode;
    sections: {
      icon?: ReactNode;
      title: string;
      content?: string;
      bullets?: string[];
    }[];
  };

  // Action buttons
  actions?: {
    label: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success';
    icon?: ReactNode;
    tooltip?: string;
    className?: string;
  }[];

  // File upload
  fileUpload?: {
    accept?: string;
    onFileSelect: (file: File) => void;
    dragDropEnabled?: boolean;
  };

  // Footer links
  footerLinks?: {
    icon: ReactNode;
    href: string;
    title?: string;
    target?: string;
  }[];

  // Styling
  className?: string;
  containerClassName?: string;
}

interface LandingPageProps extends LandingPageConfig {
  children?: ReactNode;
}

export function LandingPage({
  icon,
  title,
  subtitle,
  showInfoButton = false,
  infoPopup,
  actions = [],
  fileUpload,
  footerLinks = [],
  className = '',
  containerClassName = '',
  children
}: LandingPageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (fileUpload?.dragDropEnabled) {
      const files = Array.from(e.dataTransfer.files);
      if (files[0]) {
        fileUpload.onFileSelect(files[0]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (fileUpload?.dragDropEnabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getButtonStyles = (variant: string = 'primary') => {
    switch (variant) {
      case 'secondary':
        return 'border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50';
      case 'success':
        return 'bg-emerald-500 text-white hover:bg-emerald-600 border-2 border-emerald-500';
      case 'primary':
      default:
        return 'bg-indigo-500 text-white hover:bg-indigo-600 border-2 border-indigo-500';
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className}`}>
      <div
        className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-xl transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-gray-300 bg-white/70 backdrop-blur-sm hover:border-indigo-400 shadow-lg'
        } ${containerClassName}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          {/* Title with icon */}
          <h2 className="text-5xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            {typeof icon === 'string' ? (
              <span className="text-6xl">{icon}</span>
            ) : icon ? (
              <div className="text-6xl">{icon}</div>
            ) : null}
            {title}
          </h2>

          {/* Subtitle with optional info button */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <p className="text-xl text-gray-600">{subtitle}</p>
            {showInfoButton && (
              <div className="relative group">
                <Info
                  className="w-5 h-5 text-gray-400 cursor-help hover:text-gray-600 transition-colors"
                  onMouseEnter={() => setShowPrivacyInfo(true)}
                  onMouseLeave={() => setShowPrivacyInfo(false)}
                  aria-label="Privacy information"
                  role="button"
                  tabIndex={0}
                />
                {showPrivacyInfo && infoPopup && (
                  <div
                    className="absolute z-[100] transition-all duration-200 ease-out transform-gpu"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: 'calc(100% + 12px)',
                      maxWidth: 'min(90vw, 500px)',
                      width: '500px',
                      animation: 'fadeInScale 200ms ease-out'
                    }}
                  >
                    {/* Arrow pointer */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-50 border-l border-t border-gray-200 rotate-45"
                      style={{ zIndex: -1 }}
                    />

                    {/* Popup content */}
                    <div className="bg-gray-50 rounded-xl shadow-xl border border-gray-200 p-8">
                      {/* Header with icon */}
                      <div className="flex items-center gap-4 mb-8">
                        {infoPopup.icon && (
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {infoPopup.icon}
                          </div>
                        )}
                        <h3 className="text-2xl font-semibold text-gray-900">{infoPopup.title}</h3>
                      </div>

                      {/* Sections */}
                      {infoPopup.sections.map((section, idx) => (
                        <div key={idx} className={`flex items-start gap-4 ${idx < infoPopup.sections.length - 1 ? 'mb-8' : ''}`}>
                          {section.icon && (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                              {section.icon}
                            </div>
                          )}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h4>
                            {section.content && (
                              <p className="text-gray-600 leading-relaxed">{section.content}</p>
                            )}
                            {section.bullets && (
                              <ul className="space-y-2 text-gray-600">
                                {section.bullets.map((bullet, bulletIdx) => (
                                  <li key={bulletIdx} className="flex items-center gap-2">
                                    <span className="text-gray-400">•</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File input (hidden) */}
          {fileUpload && (
            <input
              type="file"
              accept={fileUpload.accept}
              onChange={(e) => e.target.files?.[0] && fileUpload.onFileSelect(e.target.files[0])}
              className="hidden"
              id="file-input"
            />
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {actions.map((action, idx) => {
                const isFileUploadButton = action.label === 'Choose File' && fileUpload;

                if (isFileUploadButton) {
                  return (
                    <label
                      key={idx}
                      htmlFor="file-input"
                      className={`inline-flex items-center justify-center w-52 h-20 px-6 text-lg font-medium rounded-lg cursor-pointer transition-all ${getButtonStyles(action.variant)} ${action.className || ''}`}
                      title={action.tooltip}
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </label>
                  );
                }

                return (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={`inline-flex items-center justify-center w-52 h-20 px-6 text-lg font-medium rounded-lg transition-all ${getButtonStyles(action.variant)} ${action.className || ''}`}
                    title={action.tooltip}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom children content */}
          {children}

          {/* Footer links */}
          {footerLinks.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-8">
              {footerLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target={link.target || '_blank'}
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-all hover:scale-110"
                  title={link.title}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}