import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Search, 
  FileText, 
  Upload, 
  Sparkles, 
  Shield, 
  Cloud, 
  Star, 
  Check, 
  ArrowRight, 
  Menu, 
  X,
  Database,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Memory Search",
      description: "Ask natural questions about your memories and get intelligent, contextual answers powered by advanced AI.",
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      icon: FileText,
      title: "Smart File Management",
      description: "Upload, organize, and search through your files with AI-enhanced metadata and content analysis.",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: Database,
      title: "Secure Memory Vault",
      description: "Store your precious memories, documents, and thoughts in a secure, encrypted digital vault.",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      icon: Search,
      title: "Advanced Search Engine",
      description: "Find exactly what you're looking for with our powerful search that understands context and intent.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: Cloud,
      title: "Cloud Synchronization",
      description: "Access your memories from anywhere with secure cloud storage and real-time synchronization.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your data is protected with bank-level encryption and privacy-first architecture.",
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Digital Entrepreneur",
      content: "MemoryVault has revolutionized how I manage my personal and business information. The AI search is incredibly intuitive!",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Content Creator",
      content: "I can finally find my old notes and ideas instantly. The natural language search feels like magic!",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Project Manager",
      content: "The security features give me peace of mind while the user experience is absolutely delightful.",
      rating: 5,
      avatar: "ER"
    }
  ];

  const pricingPlans = [
    {
      name: "Personal",
      price: "Free",
      period: "forever",
      description: "Perfect for individual users",
      features: [
        "100 memories storage",
        "Basic AI search",
        "1GB file storage",
        "Web access",
        "Community support"
      ],
      highlighted: false
    },
    {
      name: "Pro",
      price: "$9",
      period: "per month",
      description: "For power users and professionals",
      features: [
        "Unlimited memories",
        "Advanced AI search",
        "50GB file storage",
        "Mobile app access",
        "Priority support",
        "Export capabilities",
        "Advanced analytics"
      ],
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "$29",
      period: "per month",
      description: "For teams and organizations",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "500GB storage",
        "Admin controls",
        "SSO integration",
        "Custom integrations",
        "24/7 support"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-card-strong border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">MemoryVault</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-body hover:text-indigo-600 transition-colors">Features</a>
              <a href="#testimonials" className="text-body hover:text-indigo-600 transition-colors">Testimonials</a>
              <a href="#pricing" className="text-body hover:text-indigo-600 transition-colors">Pricing</a>
              <motion.button
                onClick={handleAuthAction}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass-button px-6 py-3 rounded-xl font-semibold shadow-lg"
              >
                {user ? 'Go to Dashboard' : 'Sign In / Sign Up'}
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg glass-card"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 space-y-4"
            >
              <a href="#features" className="block text-body hover:text-indigo-600 transition-colors">Features</a>
              <a href="#testimonials" className="block text-body hover:text-indigo-600 transition-colors">Testimonials</a>
              <a href="#pricing" className="block text-body hover:text-indigo-600 transition-colors">Pricing</a>
              <button
                onClick={handleAuthAction}
                className="w-full glass-button px-6 py-3 rounded-xl font-semibold shadow-lg"
              >
                {user ? 'Go to Dashboard' : 'Sign In / Sign Up'}
              </button>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-24 h-24 glass-card-strong rounded-3xl mb-8 shadow-xl relative"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-indigo-600" />
            </motion.div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-white rounded-full"
              />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-7xl font-bold gradient-text mb-6 leading-tight"
          >
            Your Digital
            <br />
            Memory Vault
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            Store, organize, and rediscover your memories with the power of AI. 
            Ask questions in natural language and get intelligent answers from your personal knowledge base.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <motion.button
              onClick={handleAuthAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-button-primary px-12 py-4 text-lg font-semibold rounded-2xl shadow-xl flex items-center space-x-3"
            >
              <span>{user ? 'Go to Dashboard' : 'Get Started Free'}</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card px-12 py-4 text-lg font-semibold rounded-2xl shadow-lg hover-glow"
            >
              Watch Demo
            </motion.button>
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <div className="glass-card rounded-2xl p-6 text-center hover-glow">
              <div className="text-3xl font-bold gradient-text mb-2">10K+</div>
              <div className="text-slate-600">Happy Users</div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center hover-glow">
              <div className="text-3xl font-bold gradient-text mb-2">1M+</div>
              <div className="text-slate-600">Memories Stored</div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center hover-glow">
              <div className="text-3xl font-bold gradient-text mb-2">99.9%</div>
              <div className="text-slate-600">Uptime</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">Powerful Features</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover what makes MemoryVault the ultimate solution for managing your digital memories and knowledge.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card rounded-2xl p-8 hover-glow group"
              >
                <div className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">How It Works</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Getting started with MemoryVault is simple and intuitive. Follow these easy steps.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Upload & Store",
                description: "Upload your files, documents, and memories. Our AI automatically analyzes and categorizes everything.",
                icon: Upload,
                color: "from-blue-500 to-cyan-600"
              },
              {
                step: "02",
                title: "Ask Questions",
                description: "Use natural language to search through your memories. Ask anything like 'When is mom's birthday?'",
                icon: MessageSquare,
                color: "from-indigo-500 to-purple-600"
              },
              {
                step: "03",
                title: "Get Answers",
                description: "Receive intelligent, contextual answers powered by AI that understands your personal knowledge base.",
                icon: Sparkles,
                color: "from-emerald-500 to-teal-600"
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-xl`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold gradient-text mb-4">{step.step}</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">What Users Say</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Join thousands of satisfied users who have transformed how they manage their digital memories.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-8 hover-glow"
              >
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{testimonial.name}</div>
                    <div className="text-slate-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">Simple Pricing</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose the perfect plan for your needs. Start free and upgrade as you grow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card rounded-2xl p-8 relative ${
                  plan.highlighted ? 'ring-2 ring-indigo-500 ring-opacity-50 glass-card-strong' : ''
                } hover-glow`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-slate-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 mb-8">{plan.description}</p>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-full py-3 rounded-xl font-semibold shadow-lg mb-8 ${
                      plan.highlighted 
                        ? 'glass-button-primary' 
                        : 'glass-button'
                    }`}
                  >
                    Get Started
                  </motion.button>
                  
                  <div className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card-strong rounded-3xl p-12 shadow-xl"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">Ready to Transform Your Digital Life?</h2>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
              Join thousands of users who have already discovered the power of AI-enhanced memory management.
            </p>
            
            <motion.button
              onClick={handleAuthAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-button-primary px-12 py-4 text-lg font-semibold rounded-2xl shadow-xl inline-flex items-center space-x-3"
            >
              <span>{user ? 'Go to Dashboard' : 'Start Your Journey'}</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold gradient-text">MemoryVault</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                The ultimate AI-powered solution for storing, organizing, and rediscovering your digital memories.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-800 mb-4">Product</h4>
              <div className="space-y-2">
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Security</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Integrations</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-800 mb-4">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Help Center</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Contact Us</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Privacy Policy</a>
                <a href="#" className="block text-slate-600 hover:text-indigo-600 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="text-slate-600">
              © 2025 MemoryVault. All rights reserved. Made with ❤️ for digital memory preservation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
