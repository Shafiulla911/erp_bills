import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Create New Bill heading', () => {
  render(<App />);
  expect(screen.getByText(/Create New Bill/i)).toBeInTheDocument();
});

test('renders Customer Name field', () => {
  render(<App />);
  expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument();
});

test('renders Generate Bill button', () => {
  render(<App />);
  expect(screen.getByText(/Generate Bill/i)).toBeInTheDocument();
});
