import type { Metadata } from 'next';
import Link from 'next/link';
import {
	ArrowRight,
	BookOpen,
	Bot,
	Check,
	Globe,
	MessagesSquare,
	ShieldCheck,
	Sparkles,
	Workflow,
	Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
	title: 'SupportOS — The Calm Inbox for AI-Powered Customer Operations',
	description:
		'Connect your channels, upload your documentation, and let AI resolve routine conversations while your team supervises. One calm, three-column workspace.',
	openGraph: {
		title: 'SupportOS',
		description:
			'Humans supervise. AI resolves. The calm inbox for AI-powered customer operations.',
		type: 'website',
	},
};

const features = [
	{
		icon: Sparkles,
		title: 'AI Copilot',
		description:
			'Context-aware summaries, suggested replies, intent analysis, and real-time translation—one click each, right inside the conversation.',
	},
	{
		icon: BookOpen,
		title: 'Knowledge That Answers',
		description:
			'Upload documentation, project files, or URLs. SupportOS indexes your knowledge base to ground every AI draft in factual context—complete with clear citations.',
	},
	{
		icon: Workflow,
		title: 'Visual Automations',
		description:
			"Build workflows like 'refund request → classify → draft reply → notify a human' in minutes. AI-driven steps with zero code.",
	},
	{
		icon: MessagesSquare,
		title: 'Every Channel, One Inbox',
		description:
			'An embeddable chat widget, inbound email, and Slack alerts flow into a beautifully structured, Apple Mail–calm interface.',
	},
	{
		icon: Bot,
		title: 'Your Models, Your Choice',
		description:
			'Switch between Claude, GPT, and Gemini instantly. Bring your own API keys to pay model providers directly—zero token markup, zero platform lock-in.',
	},
	{
		icon: ShieldCheck,
		title: 'Built for Real Teams',
		description:
			'Granular roles, organization-level isolation with row-level security, custom usage limits, and a full audit log from day one.',
	},
];

const steps = [
	{
		number: '01',
		title: 'Connect your channels',
		description:
			'Drop the chat widget on your site, point your inbound email at SupportOS, and wire Slack for alerts. Live in minutes, not weeks.',
	},
	{
		number: '02',
		title: 'Teach it your business',
		description:
			'Upload guidelines, contracts, internal docs, or FAQs. The knowledge base indexes them instantly for semantic search and cited answers.',
	},
	{
		number: '03',
		title: 'Let AI take the routine',
		description:
			'Automations classify, draft, and auto-resolve repetitive requests. Your team supervises and handles what actually needs a human hand.',
	},
];

const faqs = [
	{
		q: 'Which AI models does it use?',
		a: 'Anthropic Claude, OpenAI GPT, and Google Gemini—fully switchable per workspace. Because you bring your own API keys, you pay the providers directly with absolutely no middleman markup.',
	},
	{
		q: 'How does the AI ensure accuracy?',
		a: 'Upload PDFs, Markdown, or URLs to your workspace knowledge base. Content is processed and retrieved semantically, forcing the AI to strictly draft replies based on your actual data—complete with citations.',
	},
	{
		q: 'Can AI reply without human supervision?',
		a: 'Only when you want it to. Automations can either draft replies for human review or completely auto-resolve specific, low-risk conversation tracks that you explicitly define.',
	},
	{
		q: 'Is our business data securely isolated?',
		a: 'Yes. Every single workspace is cryptographically isolated using PostgreSQL row-level security (RLS). Public widgets authenticate with revocable tokens, and every administrative action is captured in an audit log.',
	},
];

export default function Home() {
	return (
		<div className="min-h-dvh overflow-x-hidden">
			{/* Nav */}
			<header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
				<nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
					<Link href="/" className="flex items-center gap-2.5">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<Sparkles className="size-4" />
						</div>
						<span className="font-serif text-xl">SupportOS</span>
					</Link>
					<div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
						<a
							href="#features"
							className="transition-colors hover:text-foreground"
						>
							Features
						</a>
						<a href="#how" className="transition-colors hover:text-foreground">
							How it works
						</a>
						<a
							href="#pricing"
							className="transition-colors hover:text-foreground"
						>
							Pricing
						</a>
					</div>
					<div className="flex items-center gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link href="/login">Sign in</Link>
						</Button>
						<Button asChild size="sm">
							<Link href="/login">
								Get started <ArrowRight className="size-3.5" />
							</Link>
						</Button>
					</div>
				</nav>
			</header>

			<main>
				{/* Hero */}
				<section className="relative">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,oklch(0.45_0.08_265/0.25),transparent)]"
					/>
					<div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-32">
						<Badge
							variant="outline"
							className="mb-6 gap-1.5 border-border bg-card/50 px-3 py-1 text-xs font-normal text-muted-foreground"
						>
							<Zap className="size-3 text-amber-400" />
							For teams drowning in repetitive tickets
						</Badge>

						<h1 className="font-serif text-5xl leading-[1.08] tracking-tight sm:text-7xl">
							Humans supervise.
							<br />
							<span className="text-muted-foreground">AI resolves.</span>
						</h1>

						<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
							SupportOS is the calm inbox for customer operations—one place for
							email, chat, and Slack conversations. It drafts replies,
							classifies requests, and resolves the repetitive ones
							automatically, grounded in your own documentation, while your
							team stays in control of everything else.
						</p>

						<div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<Button asChild size="lg" className="h-12 px-7 text-base">
								<Link href="/login">
									Get Started Free <ArrowRight className="size-4" />
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="h-12 px-7 text-base"
							>
								<a href="#how">See how it works</a>
							</Button>
						</div>
						<p className="mt-4 text-xs text-muted-foreground">
							No credit card required · Bring your own AI keys—pay providers
							directly, zero markup
						</p>

						<div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
							{[
								'Email',
								'Chat Widget',
								'AI Knowledge Base',
								'Automations',
								'Slack',
							].map(capability => (
								<span
									key={capability}
									className="flex items-center gap-1.5"
								>
									<Check className="size-3.5 text-emerald-400" />
									{capability}
								</span>
							))}
						</div>
					</div>

					{/* Product mockup */}
					<div className="relative mx-auto max-w-5xl px-6 pb-24">
						<div
							aria-hidden
							className="pointer-events-none absolute inset-x-16 -top-6 h-40 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,oklch(0.6_0.1_265/0.15),transparent)]"
						/>
						<div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-black/40">
							{/* Window chrome */}
							<div className="flex items-center gap-1.5 border-b bg-background/50 px-4 py-3">
								<span className="size-2.5 rounded-full bg-red-500/60" />
								<span className="size-2.5 rounded-full bg-amber-500/60" />
								<span className="size-2.5 rounded-full bg-emerald-500/60" />
								<span className="ml-3 text-xs text-muted-foreground">
									SupportOS — Inbox
								</span>
							</div>

							<div className="grid grid-cols-[200px_1fr] text-left text-xs sm:grid-cols-[220px_1fr_240px]">
								{/* Conversation list */}
								<div className="border-r">
									<div className="border-b px-3 py-2 font-medium">
										Conversations
									</div>
									{[
										{
											name: 'Maya Rodriguez',
											subject: 'Refund for duplicate charge',
											badge: 'high',
											badgeClass: 'bg-orange-500/15 text-orange-400',
											active: true,
										},
										{
											name: 'James Chen',
											subject: 'How do I invite my team?',
											badge: 'chat',
											badgeClass: 'bg-muted text-muted-foreground',
										},
										{
											name: 'Sofia Almeida',
											subject: 'API rate limits in production',
											badge: 'urgent',
											badgeClass: 'bg-red-500/15 text-red-400',
										},
										{
											name: 'Tom Becker',
											subject: 'Password reset link expired',
											badge: 'resolved',
											badgeClass: 'bg-emerald-500/15 text-emerald-400',
										},
									].map(c => (
										<div
											key={c.name}
											className={`border-b px-3 py-2.5 ${c.active ? 'bg-accent' : ''}`}
										>
											<div className="flex items-center justify-between">
												<span className="font-medium">{c.name}</span>
												<span className="text-[10px] text-muted-foreground">
													2m
												</span>
											</div>
											<p className="mt-0.5 truncate text-muted-foreground">
												{c.subject}
											</p>
											<span
												className={`mt-1 inline-block rounded-full px-1.5 py-px text-[9px] ${c.badgeClass}`}
											>
												{c.badge}
											</span>
										</div>
									))}
								</div>

								{/* Thread */}
								<div className="flex flex-col">
									<div className="border-b px-4 py-2 font-medium">
										Refund for duplicate charge
									</div>
									<div className="flex-1 space-y-3 p-4">
										<div className="max-w-[80%] rounded-xl rounded-tl-sm bg-muted px-3 py-2 leading-relaxed">
											Hi, I was charged twice this month — invoices #8841 and
											#8852 are identical. Can you refund one?
										</div>
										<div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 leading-relaxed text-primary-foreground">
											Hi Maya — you&apos;re right, and I&apos;m sorry about
											that. I&apos;ve refunded invoice #8852; you&apos;ll see it
											within 3–5 business days.
										</div>
										<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
											<Sparkles className="size-3" />
											Drafted by AI · grounded in “Refund policy.pdf”
										</div>
									</div>
								</div>

								{/* Copilot */}
								<div className="hidden border-l sm:block">
									<div className="flex items-center gap-1.5 border-b px-3 py-2 font-medium">
										<Sparkles className="size-3" /> Copilot
									</div>
									<div className="space-y-1 p-2">
										{[
											'Summarize conversation',
											'Suggest a reply',
											'Find documentation',
											'Analyze sentiment',
											'Escalate',
										].map((a, i) => (
											<div
												key={a}
												className={`rounded-md px-2.5 py-2 ${i === 1 ? 'bg-accent' : ''} text-muted-foreground`}
											>
												{a}
											</div>
										))}
										<div className="mt-2 rounded-md border bg-background/50 p-2.5 leading-relaxed">
											<span className="mb-1 block font-medium text-foreground">
												Suggested reply
											</span>
											Refund issued per policy §2.1 — duplicate charges reversed
											within 5 days. [1]
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Features */}
				<section id="features" className="border-t bg-card/30">
					<div className="mx-auto max-w-6xl px-6 py-24">
						<div className="mx-auto max-w-2xl text-center">
							<h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
								Everything you need.
								<br />
								<span className="text-muted-foreground">
									Zero platform AI markup.
								</span>
							</h2>
						</div>

						<div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{features.map(({ icon: Icon, title, description }) => (
								<div
									key={title}
									className="rounded-2xl border bg-card p-6 transition-colors hover:border-border hover:bg-accent/30"
								>
									<div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-foreground">
										<Icon className="size-5" />
									</div>
									<h3 className="mb-2 font-semibold">{title}</h3>
									<p className="text-sm leading-relaxed text-muted-foreground">
										{description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* How it works */}
				<section id="how" className="border-t">
					<div className="mx-auto max-w-6xl px-6 py-24">
						<div className="mx-auto max-w-2xl text-center">
							<h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
								Productive in minutes
							</h2>
							<p className="mt-4 text-muted-foreground">
								No complex enterprise implementation projects. Connect, upload
								documentation, and let it run.
							</p>
						</div>

						<div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
							{steps.map(step => (
								<div key={step.number}>
									<span className="font-serif text-5xl text-muted-foreground/40">
										{step.number}
									</span>
									<h3 className="mb-2 mt-4 font-semibold">{step.title}</h3>
									<p className="text-sm leading-relaxed text-muted-foreground">
										{step.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Pricing */}
				<section id="pricing" className="border-t bg-card/30">
					<div className="mx-auto max-w-4xl px-6 py-24">
						<div className="mx-auto max-w-2xl text-center">
							<h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
								Simple infrastructure pricing
							</h2>
							<p className="mt-4 text-muted-foreground">
								Start free to test your live workflows, scale up when you
								expand.
							</p>
						</div>

						<div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
							{/* Free */}
							<div className="rounded-2xl border bg-card p-8">
								<h3 className="font-semibold">Free</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									Perfect for testing live operational workflows.
								</p>
								<p className="mt-6 font-serif text-5xl">$0</p>
								<ul className="mt-8 space-y-3 text-sm">
									{[
										'3 team members',
										'50 AI actions / month',
										'20 knowledge documents',
										'Chat widget + inbound email',
										'Automations & audit log',
									].map(item => (
										<li key={item} className="flex items-center gap-2.5">
											<Check className="size-4 shrink-0 text-emerald-400" />
											<span className="text-muted-foreground">{item}</span>
										</li>
									))}
								</ul>
								<Button asChild variant="outline" className="mt-8 w-full">
									<Link href="/login">Start free</Link>
								</Button>
							</div>

							{/* Pro */}
							<div className="relative rounded-2xl border border-primary/30 bg-card p-8 shadow-lg shadow-primary/5">
								<Badge className="absolute -top-2.5 right-6">
									Most popular
								</Badge>
								<h3 className="font-semibold">Pro</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									For operations running completely on autopilot.
								</p>
								<p className="mt-6 font-serif text-5xl">
									$49
									<span className="font-sans text-base text-muted-foreground">
										/month
									</span>
								</p>
								<ul className="mt-8 space-y-3 text-sm">
									{[
										'Unlimited team members',
										'2,000 AI actions / month',
										'500 knowledge documents',
										'Everything in Free',
										'Priority support',
									].map(item => (
										<li key={item} className="flex items-center gap-2.5">
											<Check className="size-4 shrink-0 text-emerald-400" />
											<span className="text-muted-foreground">{item}</span>
										</li>
									))}
								</ul>
								<Button asChild className="mt-8 w-full">
									<Link href="/login">
										Get Pro <ArrowRight className="size-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section id="faq" className="border-t">
					<div className="mx-auto max-w-3xl px-6 py-24">
						<h2 className="text-center font-serif text-4xl tracking-tight">
							Questions, answered
						</h2>
						<div className="mt-12 space-y-4">
							{faqs.map(faq => (
								<details
									key={faq.q}
									className="group rounded-xl border bg-card px-5 py-4 open:pb-5"
								>
									<summary className="cursor-pointer list-none text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
										{faq.q}
									</summary>
									<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
										{faq.a}
									</p>
								</details>
							))}
						</div>
					</div>
				</section>

				{/* Final CTA */}
				<section className="relative border-t">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 h-[400px] bg-[radial-gradient(ellipse_60%_60%_at_50%_110%,oklch(0.45_0.08_265/0.2),transparent)]"
					/>
					<div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
						<div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
							<Sparkles className="size-5" />
						</div>
						<h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
							Your AI operations workspace is
							<br />
							one sign-up away.
						</h2>
						<p className="mx-auto mt-4 max-w-md text-muted-foreground">
							Create an isolated workspace, load the interactive demo data, and
							explore the AI Copilot workflow in under two minutes.
						</p>
						<Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
							<Link href="/login">
								Get started free <ArrowRight className="size-4" />
							</Link>
						</Button>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
					<div className="flex items-center gap-2">
						<Sparkles className="size-4" />
						<span className="font-serif text-base text-foreground">
							SupportOS
						</span>
					</div>
					<div className="flex items-center gap-6">
						<a
							href="#features"
							className="transition-colors hover:text-foreground"
						>
							Features
						</a>
						<a
							href="#pricing"
							className="transition-colors hover:text-foreground"
						>
							Pricing
						</a>
						<Link
							href="/login"
							className="transition-colors hover:text-foreground"
						>
							Sign in
						</Link>
					</div>
					<div className="flex items-center gap-1.5">
						<Globe className="size-3.5" />
						<span>© {new Date().getFullYear()} SupportOS</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
