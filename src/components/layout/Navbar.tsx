'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ChevronRight, Menu, Phone } from 'lucide-react';
import { Logo } from '../ui/logo';
import { services } from '@/data/data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { useState } from 'react';
import { isAnyRouteActive, isRouteActive } from '@/lib/nav-active';

const topLevelLinkClass = (active: boolean) =>
  cn(
    'border-b-2 border-transparent px-2 py-1 text-base font-medium transition-colors duration-200 ease-out',
    active ? 'border-brand font-semibold text-brand' : 'text-black hover:text-brand'
  );

const triggerLinkClass = (active: boolean) =>
  cn(
    'border-b-2 bg-transparent px-2 py-1 text-base font-medium transition-colors duration-200 ease-out',
    active
      ? 'border-brand font-semibold text-brand'
      : 'border-transparent text-black hover:text-brand'
  );

const dropdownItemClass = (active: boolean) =>
  cn(
    'px-6 py-1 text-base text-nowrap rounded transition-colors duration-200 ease-out hover:bg-gray-50',
    active ? 'bg-brand/10 text-brand font-semibold' : 'text-black hover:text-brand'
  );

const mobileLinkClass = (active: boolean) =>
  cn(
    'rounded text-base transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
    active ? 'font-semibold text-brand' : 'text-black hover:text-brand'
  );

export const Navbar = () => {
  const [isShow, setIsShow] = useState<boolean>(false);
  const pathname = usePathname();

  const isHomeActive = isRouteActive(pathname, '/');
  const isAboutActive = isRouteActive(pathname, '/about');
  const isServicesActive = isRouteActive(pathname, '/services');
  const isResourcesActive = isAnyRouteActive(pathname, ['/resources', '/our-journey']);
  const isBlogsActive = isRouteActive(pathname, '/resources/blogs');
  const isOurJourneyActive = isRouteActive(pathname, '/our-journey');
  const isCaseStudiesActive = isRouteActive(pathname, '/case-studies');
  const isContactActive = isRouteActive(pathname, '/contact');

  return (
    <>
      <header className="w-full border-b border-b-black/5 bg-white sticky top-0 z-50 transition duration-300">
        <div className="max-w-full mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo — left of the navbar */}
          <Logo
            src="/ISHA-TECHNO-LG.png"
            width={2172}
            height={724}
            imgClassName="h-9 lg:h-11 w-auto"
          />

          {/* Navigation */}
          <NavigationMenu viewport={false} className="hidden lg:flex">
            <NavigationMenuList className="flex items-center gap-4">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isHomeActive}
                  className={topLevelLinkClass(isHomeActive)}
                >
                  <Link href="/" aria-current={isHomeActive ? 'page' : undefined}>
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isAboutActive}
                  className={topLevelLinkClass(isAboutActive)}
                >
                  <Link href="/about" aria-current={isAboutActive ? 'page' : undefined}>
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerLinkClass(isServicesActive)}>
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-2 grid gap-2 border-black/5 w-max bg-white shadow-lg rounded-lg">
                  {services.map((service, idx) => {
                    const isActive = isRouteActive(pathname, service.link);
                    return (
                      <NavigationMenuLink
                        asChild
                        key={idx}
                        active={isActive}
                        className={dropdownItemClass(isActive)}
                      >
                        <Link href={service.link} aria-current={isActive ? 'page' : undefined}>
                          <span className="flex justify-between items-center gap-2">
                            {service.title}

                            <ChevronRight />
                          </span>
                        </Link>
                      </NavigationMenuLink>
                    );
                  })}
                  <hr className="my-1 border-black/5" />
                  <NavigationMenuLink
                    asChild
                    className="px-6 py-1 text-base bg-brand text-white hover:text-brand text-center hover:bg-gray-50 rounded text-nowrap transition-colors duration-200 ease-out"
                  >
                    <Link href="/services">Explore Services</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources dropdown */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerLinkClass(isResourcesActive)}>
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-2 grid gap-2 border-black/5 w-48 bg-white shadow-lg rounded-lg">
                  <NavigationMenuLink
                    asChild
                    active={isBlogsActive}
                    className={dropdownItemClass(isBlogsActive)}
                  >
                    <Link
                      href="/resources/blogs"
                      aria-current={isBlogsActive ? 'page' : undefined}
                    >
                      Blogs
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    asChild
                    active={isOurJourneyActive}
                    className={dropdownItemClass(isOurJourneyActive)}
                  >
                    <Link
                      href="/our-journey"
                      aria-current={isOurJourneyActive ? 'page' : undefined}
                    >
                      Our Journey
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isCaseStudiesActive}
                  className={topLevelLinkClass(isCaseStudiesActive)}
                >
                  <Link
                    href="/case-studies"
                    aria-current={isCaseStudiesActive ? 'page' : undefined}
                  >
                    Case Studies
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isContactActive}
                  className={topLevelLinkClass(isContactActive)}
                >
                  <Link href="/contact" aria-current={isContactActive ? 'page' : undefined}>
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Contact Button */}
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="primary"
              className="h-10 rounded-lg px-5"
            >
              <Link href="/contact" className="flex items-center">
                <Phone />
                Talk to an Expert
              </Link>
            </Button>

            {/* Mobile Sheet */}
            <Sheet open={isShow} onOpenChange={setIsShow}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="lg:hidden text-black hover:text-brand"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-white gap-0 space-y-0 overflow-y-auto"
              >
                <SheetHeader className="bg-brand/5 py-5">
                  <Logo
                    src="/ISHA-TECHNO-LG.png"
                    width={2172}
                    height={724}
                    imgClassName="h-10 w-auto"
                  />
                </SheetHeader>
                <nav className="flex flex-col gap-6 p-6 border-t border-t-black/5">
                  <Link
                    href="/contact"
                    className="w-full text-center bg-brand text-white rounded-lg px-5 py-3 text-base font-semibold hover:bg-brand/90 transition-colors"
                    onClick={() => setIsShow(false)}
                  >
                    Talk to an Expert
                  </Link>
                  <Link
                    href="/"
                    className={mobileLinkClass(isHomeActive)}
                    aria-current={isHomeActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/about"
                    className={mobileLinkClass(isAboutActive)}
                    aria-current={isAboutActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    About
                  </Link>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="services">
                      <AccordionTrigger
                        className={cn(
                          'py-0 text-base font-medium transition-colors duration-200 ease-out',
                          isServicesActive ? 'text-brand' : 'text-black hover:text-brand'
                        )}
                      >
                        Services
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-4 mt-2">
                          {services.map((service, idx) => {
                            const isActive = isRouteActive(pathname, service.link);
                            return (
                              <Link
                                key={idx}
                                href={service.link}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                  'flex items-center justify-between text-sm rounded p-2 transition-colors duration-200 ease-out hover:bg-gray-50',
                                  isActive
                                    ? 'bg-brand/10 text-brand font-semibold'
                                    : 'text-black hover:text-brand'
                                )}
                                onClick={() => setIsShow(false)}
                              >
                                {service.title}
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            );
                          })}
                          <hr className="my-1 border-black/5" />
                          <Link
                            href="/services"
                            className="px-3 py-2 text-center text-base bg-brand text-white transition-colors duration-200 ease-out hover:bg-gray-50 hover:text-brand rounded"
                            onClick={() => setIsShow(false)}
                          >
                            Explore Services
                          </Link>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Link
                    href="/resources/blogs"
                    className={mobileLinkClass(isBlogsActive)}
                    aria-current={isBlogsActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Blogs
                  </Link>
                  <Link
                    href="/our-journey"
                    className={mobileLinkClass(isOurJourneyActive)}
                    aria-current={isOurJourneyActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Our Journey
                  </Link>
                  <Link
                    href="/case-studies"
                    className={mobileLinkClass(isCaseStudiesActive)}
                    aria-current={isCaseStudiesActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Case Studies
                  </Link>
                  <Link
                    href="/contact"
                    className={mobileLinkClass(isContactActive)}
                    aria-current={isContactActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Contact
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};
