import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <h2>Welcome to SentriZK</h2>
      <p>
        This is a demo of <strong>ZKP-based authentication</strong> using Poseidon hashes and SnarkJS.
      </p>
      <div style={{ marginTop: 20 }}>
        <Link href="/register">
          <button style={{ marginRight: 10 }}>Register</button>
        </Link>
        <Link href="/login">
          <button>Login</button>
        </Link>
      </div>
    </div>
  );
}
