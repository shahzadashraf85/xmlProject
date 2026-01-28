import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    History,
    Package,
    Grid,
    Wrench,
    Mail,
    LogOut,
    User,
    Menu,
    FileSpreadsheet,
    ShoppingBag,
    Download,
    Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarLayoutProps {
    children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const { user, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    async function handleSignOut() {
        await signOut();
        navigate('/login');
    }

    const navSections = [
        {
            title: 'Shipping',
            items: [
                { name: 'Shipping Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
                { name: 'History', path: '/history', icon: <History size={20} /> },
            ]
        },
        {
            title: 'Inventory',
            items: [
                { name: 'Inventory Manager', path: '/inventory', icon: <Package size={20} /> },
                { name: 'Master Inventory', path: '/inventory-grid', icon: <Grid size={20} /> },
                { name: 'Parts Management', path: '/parts', icon: <Wrench size={20} /> },
                { name: 'Messages', path: '/messages', icon: <Mail size={20} /> },
                { name: 'Label Printer', path: '/label-printer', icon: <Printer size={20} /> },
                { name: 'Purchase Management', path: '/purchase-management', icon: <ShoppingBag size={20} /> },
            ]
        },
        {
            title: 'Listing',
            items: [
                { name: 'Best Buy Templates', path: '/bestbuy/templates', icon: <FileSpreadsheet size={20} /> },
                { name: 'Best Buy Listings', path: '/bestbuy/listings', icon: <ShoppingBag size={20} /> },
                { name: 'Best Buy Exports', path: '/bestbuy/exports', icon: <Download size={20} /> },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-muted/40 print:h-auto print:bg-white print:block">
            {/* Sidebar */}
            <div className="hidden border-r bg-slate-950 text-slate-50 md:block w-64 flex-col print:hidden transition-all duration-300 ease-in-out">
                <div className="flex h-16 items-center border-b border-slate-800 px-6">
                    <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Laptek Systems
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto py-4">
                    <nav className="grid items-start px-4 text-sm font-medium gap-1">
                        {navSections.map((section) => (
                            <React.Fragment key={section.title}>
                                <div className="px-3 mt-4 mb-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{section.title}</h3>
                                </div>
                                {section.items.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all
                                            ${isActive
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                                    : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            {item.icon}
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                <div className="border-t border-slate-800 p-4">
                    <div className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30">
                            <User size={16} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-xs font-medium text-slate-300">Logged in as</p>
                            <p className="truncate text-xs text-slate-500" title={user?.email || ''}>{user?.email}</p>
                        </div>
                    </div>

                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={handleSignOut}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Mobile Header (visible only on small screens) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-50 print:hidden">
                <div className="flex items-center gap-2 font-bold text-white">
                    <Package className="h-5 w-5 text-blue-500" />
                    <span>Laptek</span>
                </div>
                <Button variant="ghost" size="icon" className="text-white">
                    <Menu />
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:mt-0 mt-16 bg-background">
                <main className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
                    {children}
                </main>
            </div>
        </div>
    );
}
