"use client";

import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  MessageCircle,
  FileText,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function SupportPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <HelpCircle className="h-8 w-8" />
              Support Center
            </h1>
            <p className="text-muted-foreground mt-2">
              How can we help you today?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Disputes */}
            {session && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Disputes
                  </CardTitle>
                  <CardDescription>
                    Report issues with bookings and request resolutions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you had a problem with a service, you can open a dispute to request a refund or resolution.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/support/disputes">
                      <Button variant="outline">View My Disputes</Button>
                    </Link>
                    <Link href="/support/disputes/new">
                      <Button>Open New Dispute</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Messages */}
            {session && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    Messages
                  </CardTitle>
                  <CardDescription>
                    Contact your service provider directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Have a question about a booking? Message your worker directly through the app.
                  </p>
                  <Link href="/messages">
                    <Button variant="outline">Go to Messages</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Contact Us */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Contact Us
                </CardTitle>
                <CardDescription>
                  Get in touch with our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="mailto:support@servantana.com"
                      className="text-blue-600 hover:underline"
                    >
                      support@servantana.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <p className="text-muted-foreground">
                    Available Monday - Friday, 9am - 6pm EST
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-orange-600" />
                  FAQ
                </CardTitle>
                <CardDescription>
                  Find answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Common Questions:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>How do I cancel a booking?</li>
                    <li>What is the refund policy?</li>
                    <li>How do I register as a worker?</li>
                    <li>How are payments processed?</li>
                  </ul>
                </div>
                <Button variant="outline" className="mt-4">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View All FAQs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
