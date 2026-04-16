export const samplePost = {
  title: "A Singular Vision: Math, Design, and Computation",
  author: "Creator",
  date: "April 16, 2026",
  content: `
Welcome to the edge of expression. This blog post natively renders **LaTeX**, compiles **TikZ** into SVGs via WebAssembly, and sandboxes interactive **HTML/CSS/JS** right within the markdown flow.

## 1. Advanced Mathematics (LaTeX)

We can seamlessly inline math like $E = mc^2$ or display complex block equations:

$$
\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla) \\mathbf{u} = -\\frac{1}{\\rho} \\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}
$$

The Navier-Stokes equations render gracefully using \`KaTeX\`.

## 2. Dynamic Diagrams (TikZ)

No need to upload static images. We compile TikZ diagrams directly in the browser!

\`\`\`tikz
\\begin{tikzpicture}
  \\draw[thick, ->] (0, 0) -- (4, 0) node[right] {$x$};
  \\draw[thick, ->] (0, 0) -- (0, 4) node[above] {$y$};
  \\draw[blue, thick, domain=0:3.5, samples=100] plot (\\x, {0.2*\\x*\\x}) node[right] {$y = 0.2x^2$};
  \\filldraw[red] (2, 0.8) circle (2pt) node[anchor=north west] {Point};
\\end{tikzpicture}
\`\`\`

## 3. Interactive Animations (Sandboxed HTML)

Bring ideas to life with sandboxed, isolated web environments. Your CSS and JS won't leak!

\`\`\`html-live
<style>
  html, body {
    margin: 0;
    padding: 0;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #141218; 
    color: #fff;
    font-family: sans-serif;
  }
  .orb {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #D0BCFF, #EFB8C8);
    animation: drift 3s ease-in-out infinite alternate;
    box-shadow: 0 0 20px rgba(208, 188, 255, 0.5);
  }
  @keyframes drift {
    from { transform: translateY(-30px) scale(1); }
    to { transform: translateY(30px) scale(1.1); }
  }
</style>
<div class="orb"></div>
\`\`\`

This is the power of the new Material 3 Expressive stack mixed with a fully programmable article structure.
`
};
