import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Brain, 
  FileImage, 
  Search, 
  Settings,
  LogOut,
  Sparkles,
  Network,
  MoreHorizontal
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Navigation = () => {
  const { signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isVerySmallScreen, setIsVerySmallScreen] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  // Detect very small screens
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsVerySmallScreen(window.innerWidth < 375); // iPhone SE and smaller
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard', gradient: 'from-indigo-500 to-blue-500', priority: 1 },
    { to: '/memories', icon: Brain, label: 'Memories', gradient: 'from-purple-500 to-indigo-500', priority: 2 },
    { to: '/files', icon: FileImage, label: 'Files', gradient: 'from-emerald-500 to-teal-500', priority: 3 },
    { to: '/search', icon: Search, label: 'Search', gradient: 'from-blue-500 to-cyan-500', priority: 4 },

    { to: '/knowledge-graph', icon: Network, label: 'Knowledge Graph', gradient: 'from-pink-500 to-rose-500', priority: 7 },
    { to: '/settings', icon: Settings, label: 'Settings', gradient: 'from-slate-500 to-gray-500', priority: 6 },
  ];

  // On very small screens, show only the most important items
  const mobileNavItems = isVerySmallScreen 
    ? navItems.filter(item => item.priority <= 4) // Show only first 4 items
    : navItems;
    
  // Items that go in the "More" menu on very small screens
  const moreMenuItems = isVerySmallScreen 
    ? navItems.filter(item => item.priority > 4)
    : [];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav 
        className="hidden md:flex md:flex-col md:w-72 glass-nav md:fixed md:h-full md:left-0 md:top-0 md:z-50 md:shadow-2xl"
        style={{ 
          position: 'fixed',
          left: '0',
          top: '0',
          height: '100vh',
          width: '18rem',
          zIndex: 50
        }}
      >
        <div className="p-8 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="relative">
              <div className="w-12 h-12 glass-card-strong rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div>
              <h1 className="text-2xl heading-xl gradient-text">MemoryVault</h1>
              <p className="text-sm text-caption text-slate-500 mt-0.5">AI-powered memory</p>
            </div>
          </motion.div>
        </div>
        
        <div className="flex-1 p-6 space-y-2">
          {navItems.map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'glass-card-strong shadow-lg text-indigo-700 bg-gradient-to-r from-indigo-50/50 to-purple-50/30'
                      : 'text-slate-600 hover:glass-card-medium hover:text-indigo-600 hover:shadow-md'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${item.gradient} shadow-lg text-white`
                          : 'bg-slate-100/50 group-hover:bg-white/70 text-slate-500 group-hover:text-indigo-500'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-body-medium transition-all duration-300 ${
                      isActive ? 'text-slate-800' : 'group-hover:text-indigo-600'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </div>

        <div className="p-6 border-t border-white/10">
          <motion.button
            onClick={signOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group w-full flex items-center space-x-4 p-4 rounded-2xl text-slate-600 hover:glass-card-medium hover:text-red-500 transition-all duration-300"
          >
            <div className="p-2.5 rounded-xl bg-slate-100/50 group-hover:bg-red-50 text-slate-500 group-hover:text-red-500 transition-all duration-300">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-body-medium">Sign Out</span>
          </motion.button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card-ultra border-t border-white/20 z-50 p-2 sm:p-4">
        <div className="flex justify-between items-center px-1 sm:px-2">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center space-y-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 min-w-0 flex-1 max-w-none ${
                  isActive
                    ? 'glass-card-strong text-indigo-600 shadow-lg'
                    : 'text-slate-500 hover:text-indigo-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                        : 'bg-slate-100/30 hover:bg-white/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs text-caption truncate max-w-full">
                    {item.label === 'Knowledge Graph' ? 'Graph' : item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          
          {/* More menu for very small screens */}
          {isVerySmallScreen && moreMenuItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 text-slate-500 hover:text-indigo-500"
              >
                <div className="p-1.5 rounded-lg bg-slate-100/30 hover:bg-white/50 transition-all duration-300">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <span className="text-xs text-caption">More</span>
              </button>
              
              {/* Dropdown menu */}
              {showMoreMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-32">
                    {moreMenuItems.map((item) => (
                      <button
                        key={item.to}
                        onClick={() => {
                          navigate(item.to);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <div className={`p-1 rounded bg-gradient-to-r ${item.gradient} text-white`}>
                          <item.icon className="w-3 h-3" />
                        </div>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navigation;