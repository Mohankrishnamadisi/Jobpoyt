import React from 'react';
import { Box, Container, Typography, TextField, Button, Card, CardContent } from '@mui/material';
import { Layout } from '@components/layout/Layout';
import toast from 'react-hot-toast';
import { SEO } from '@components/seo/SEO';
import { siteConfig } from '@config/site';

export const Contact: React.FC = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message sent! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <Layout>
      <SEO title="Contact JobPoyt" description="Contact JobPoyt for help with job search, recruiting, accounts and platform questions." canonical={`${siteConfig.url}/contact`} />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
            Get in Touch
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Message"
                name="message"
                multiline
                rows={5}
                value={formData.message}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
              />

              <Button type="submit" variant="contained" size="large" fullWidth>
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};
