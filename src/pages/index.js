import * as React from "react"

const pageStyles = {
  color: "#232129",
  fontFamily: "Clash Display Variable, -apple-system, Roboto, sans-serif, serif",
  letterSpacing: ".5px",
  lineHeight: "1.25em",
  fontWeight: 500,
  margin: "0 auto",
}

const headingStyles = {
  marginTop: 0,  
  marginBottom: 0,
  fontSize: ".6em",
  color: "#04cf55",
  fontWeight: 500,
}

const sectionStyles = {
  marginBottom: "3.33em",
}

const projectListStyles = {
  listStyleType: "none",
  paddingLeft: 0,
}
const projectListItemStyles = {
  fontWeight: "inherit",
  fontSize: "inherit",
  marginBottom: 0,
}

const projectListItemDescription = {
  color: "#a4adb4",
  fontSize: ".56em",
  marginTop: ".4em",
  lineHeight: "1.2em",
  fontWeight: "400",

  marginBottom: 0,
}

const jobs = [
  {
    client: "DCMS",
    role: "Helping government make better use of data",
    description: "Taking a holistic view of the data landscape to enable better knowledge sharing with DCMS's users."
  },
  {
    client: "DCMS",
    role: "Building the foundations of a digital transformation programme for DCMS",
    description: "Mapping of DCMS's services and service lines to develop a user-centered roadmap for change.",
  },
  {
    client: "DfE",
    role: "Coaching and mentoring in organisational service transformation",
    description: "Upskilling leadership and service teams across government.",
   },
   {
    client: "DfE",
    role: "Co-designing a service to help people retrain into new careers",
    description: "Service design lead on the National Retraining Scheme - £100m multichannel service for the DfE with multiple products, integrating careers guidance, online learning and job search.",
  },
   {
    client: "The Planning Inspectorate",
    role: "Redesigning how people have their say about national infrastructure projects",
    description: "Designing multiple products, support mechanisms and comms with the Planning Inspectorate to improve efficiency, accessibility and brand trust.",
  },
   {
    client: "Parity Projects",
    role: "Helping reduce fuel poverty in England",
    description: "Redesigning a service that helps property owners make thier building's more energy efficient.",
  },
  {
    client: "Florence",
    role: "Creating a strategy and design system for rapid development of health care services",
    description: "Working with Florence to enable faster prototyping and more accessible digital services for health care professionals.",
  },
  {
    client: "Cabinet Office",
    role: "Designing an AI-powered search engine for government",
    description: "Helping the Cabinet office make sense of the knowledge trapped in billions of documents spread across government.",
  },

]

const links = [
  {
    text: "Designing a retraining scheme that meets user needs",
    url: "https://dfedigital.blog.gov.uk/2018/12/20/designing-a-retraining-scheme-that-meets-user-needs/"
  },
  {
    text: "Are you an easy hacking target? Cybersecurity tips for small business",
    url: "https://www.theguardian.com/small-business-network/2017/sep/08/are-you-an-easy-hacking-target-cyber-security-tips-for-small-business",
  },
  {
    text: "Education Secretary sets out vision for character and resilience",
    url: "https://www.gov.uk/government/news/education-secretary-sets-out-vision-for-character-and-resilience",
  },
  {
    text: "Product hunt launch of Hacksy",
    url: "https://www.producthunt.com/posts/hacksy-by-decoded",
  },
]

const IndexPage = () => {
  return (
    <main style={pageStyles}>
      <section style={sectionStyles}>
        <h1 style={headingStyles}>Phil Sherwin-Nicholls</h1>
        <p>
          A service designer, digital technologist and mentor. 
        </p>
        <p>
        Working at the intersection of technology, data and design &mdash; I help governments, businesses and charities solve wicked, population scale problems.        </p>
        <p>
          Get in touch via <a target="_blank" rel="noopener noreferrer" href="mailto:hey@philsn.co.uk">e-mail</a>,{" "}<a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/philsn/">LinkedIn</a>{" "}or{" "}<a target="_blank" rel="noopener noreferrer" href="mailto:hey@philsn.co.uk">Twitter</a>.
        </p>
      </section>
      <section style={sectionStyles}>
        <h2 style={headingStyles}>A few projects I've worked on:</h2>
        <ul style={projectListStyles}>
          {jobs.map((experience,i) => (
            <li key={i}>
              <span>
                  <h3 style={projectListItemStyles}>{experience.role}</h3>
                  <p style={projectListItemDescription}>{experience.description}</p>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section style={sectionStyles}>
        <h2 style={headingStyles}>I've been featured in:</h2>
        <ul style={projectListStyles}>
          {links.map((link,i) => (
            <li key={i}>
              <p>
                <a href={link.url}>
                  {link.text}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default IndexPage

export const Head = () => <title>Home Page</title>
