"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight, FileText, Users, MessageSquare, BookOpen } from 'lucide-react';
import { Logo } from "../components/logo";

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-[980px] mx-auto px-4">
                    <nav className="flex items-center justify-between h-12">
                        <div className="flex items-center space-x-8">
                            <Link href="/" className="flex items-center space-x-2">
                                <Logo size={24} />
                                <span className="text-black dark:text-white font-medium">SOMNI</span>
                            </Link>
                            <Link
                                href="#features"
                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            >
                                Features
                            </Link>
                            <Link
                                href="#compatibility"
                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            >
                                Compatibility
                            </Link>
                            <Link
                                href="#resources"
                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            >
                                Resources
                            </Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                >
                                    Dashboard
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            >
                                Download
                            </Button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section ref={heroRef} className="pt-32 pb-16 overflow-hidden">
                <div className="max-w-[980px] mx-auto px-4 text-center">
                    <motion.div
                        className="flex flex-col items-center justify-center mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Logo size={80} className="mb-4" />
                        <h1 className="text-5xl md:text-6xl font-bold">SOMNI</h1>
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Advanced audio processing and analysis for filmmakers and content creators
                        </p>
                    </motion.div>

                    <motion.div className="mt-8 flex justify-center gap-4">
                        <Link href="/dashboard">
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12 px-8 text-lg">
                                Get Started
                            </Button>
                        </Link>
                        <Link href="#features">
                            <Button variant="outline" className="rounded-full h-12 px-8 text-lg">
                                Learn More
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.div
                        className="relative h-[600px] mt-16"
                        style={{ opacity }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-full" style={{ y }}>
                            <div className="rounded-xl overflow-hidden shadow-2xl">
                                <Image
                                    src="/placeholder.svg?height=500&width=800&text=SOMNI Pro Dashboard"
                                    alt="SOMNI Pro Dashboard"
                                    width={800}
                                    height={500}
                                    className="w-full"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-[980px] mx-auto px-4 text-center">
                    <motion.h2
                        className="text-5xl md:text-7xl font-bold mb-6 dark:text-white"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Intelligent audio analysis.
                    </motion.h2>

                    <motion.p
                        className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        SOMNI Pro helps you transcribe, analyze, and extract insights from your audio content with powerful AI tools
                        designed for filmmakers and content creators.
                    </motion.p>
                </div>
            </section>

            {/* Agent Tools Section */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-[980px] mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white">AI-Powered Agent Tools</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            SOMNI Pro includes four specialized AI agents that work together to analyze your audio content and extract
                            valuable insights.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {agents.map((agent, index) => (
                            <motion.div
                                key={agent.id}
                                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <div className={`w-12 h-12 rounded-lg ${agent.color} flex items-center justify-center mb-4`}>
                                    <agent.icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 dark:text-white">{agent.name}</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">{agent.description}</p>
                                <Link href="/dashboard/agents" className="text-blue-500 font-medium inline-flex items-center text-sm">
                                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                <div className="max-w-[980px] mx-auto px-4 text-center">
                    <motion.h2
                        className="text-4xl md:text-5xl font-bold mb-6 dark:text-white"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Ready to experience SOMNI Pro?
                    </motion.h2>

                    <motion.p
                        className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Transform your audio content with powerful AI analysis and insights.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link href="/dashboard">
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12 px-8 text-lg">
                                Get Started Now
                            </Button>
                        </Link>
                        <Button variant="outline" className="rounded-full h-12 px-8 text-lg">
                            Request a Demo
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-200 dark:border-gray-800 dark:bg-gray-950">
                <div className="max-w-[980px] mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                            <h4 className="text-sm font-semibold mb-4 dark:text-white">SOMNI</h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Overview
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#features"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Features
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#compatibility"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Compatibility
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#resources"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Resources
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-4 dark:text-white">Support</h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Help
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Documentation
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Contact Us
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Community
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-4 dark:text-white">Company</h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Careers
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Press
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-4 dark:text-white">Legal</h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Privacy
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Terms
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Licenses
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    >
                                        Cookies
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Copyright © {new Date().getFullYear()} SOMNI. All rights reserved.
                            </p>
                            <Logo size={24} />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

const agents = [
    {
        id: "speaker-id",
        name: "Speaker Identification",
        description: "Identify and label different speakers in your audio files",
        icon: Users,
        color: "bg-blue-500",
    },
    {
        id: "summarize",
        name: "Transcript Summarization",
        description: "Generate concise summaries of your transcripts",
        icon: FileText,
        color: "bg-green-500",
    },
    {
        id: "classify",
        name: "Dialog Classification",
        description: "Classify dialog by topic, sentiment, and intent",
        icon: MessageSquare,
        color: "bg-purple-500",
    },
    {
        id: "storyline",
        name: "Storyline Generation",
        description: "Generate narrative storylines from your content",
        icon: BookOpen,
        color: "bg-orange-500",
    },
];