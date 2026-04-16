import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img src="/pyu_go_icon.png" alt="PYU GO" className="w-10 h-10 rounded-xl" />
              <span className="text-2xl font-bold text-white">PYU GO</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Your ultimate travel companion for seamless shuttle bookings and premium hotel stays. 
              Simplifying travel since 2026.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={<Facebook className="w-5 h-5" />} />
              <SocialLink icon={<Instagram className="w-5 h-5" />} />
              <SocialLink icon={<Twitter className="w-5 h-5" />} />
              <SocialLink icon={<Youtube className="w-5 h-5" />} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><FooterLink href="/shuttle">Shuttle Booking</FooterLink></li>
              <li><FooterLink href="/hotel">Hotel Reservation</FooterLink></li>
              <li><FooterLink href="/ride">On-demand Ride</FooterLink></li>
              <li><FooterLink href="/promo">Latest Promos</FooterLink></li>
              <li><FooterLink href="/order-status">Order Status</FooterLink></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><FooterLink href="/help">Help Center</FooterLink></li>
              <li><FooterLink href="/terms">Terms & Conditions</FooterLink></li>
              <li><FooterLink href="/privacy">Privacy Policy</FooterLink></li>
              <li><FooterLink href="/faq">FAQs</FooterLink></li>
              <li><FooterLink href="/contact">Contact Us</FooterLink></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Jalan Raya No. 123, Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+62 812 3456 7890</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>support@pyugo.com</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-800 mb-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2026 PYU GO. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="cursor-pointer hover:text-white transition-colors">English (US)</span>
            <span className="cursor-pointer hover:text-white transition-colors">USD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon }: { icon: React.ReactNode }) {
  return (
    <a 
      href="#" 
      className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-gray-400"
    >
      {icon}
    </a>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a 
      href={href} 
      className="hover:text-primary transition-colors block py-0.5"
    >
      {children}
    </a>
  );
}
