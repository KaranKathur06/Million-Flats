export default function FAQ() {
  const faqs = [
    {
      question: 'How do I list a property on millionflats?',
      answer: 'Join our agent network and register your properties through the Agent Portal. Our team will verify each listing to ensure it meets our premium standards.',
    },
    {
      question: 'What makes a property eligible for listing?',
      answer: 'We focus on premium properties valued at $1M+ with exceptional quality, location, and market potential. Every listing undergoes rigorous verification.',
    },
    {
      question: 'How do I schedule a property tour?',
      answer: 'Browse properties and click \'Schedule Tour\' to connect directly with the listing agent. They\'ll confirm your preferred date and time.',
    },
    {
      question: 'Is millionflats available globally?',
      answer: 'Yes! We operate in 150+ countries with agents in major luxury real estate markets worldwide. Properties are available on a global scale.',
    },
  ]

  return (
    <section className="bg-white rounded-lg p-8 shadow-md">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-600">
          Find answers to common questions about our platform and services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-blue mb-3">{faq.question}</h3>
            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

