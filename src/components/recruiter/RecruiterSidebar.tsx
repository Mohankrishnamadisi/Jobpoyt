import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Event as EventIcon,
  Mail as MailIcon,
  QueryStats as QueryStatsIcon,
  SmartToy as SmartToyIcon,
  SettingsSuggest as SettingsSuggestIcon,
  People as PeopleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  AccountTree as AccountTreeIcon,
  BusinessCenter as BusinessCenterIcon,
  BrandingWatermark as BrandingWatermarkIcon,
  FolderSpecial as PoolIcon,
  LocalOffer as TagIcon,
  Group as GroupIcon,
  IntegrationInstructions as IntegrationInstructionsIcon,
  Receipt as ReceiptIcon,
  TravelExplore as MarketIntelligenceIcon,
  Security as SecurityCenterIcon,
  Apartment as OrganizationIcon,
  PhonelinkSetup as MobilePwaIcon,
  AssignmentTurnedIn as AssessmentsIcon,
  Diversity3 as TalentCommunityIcon,
  Handshake as EmployeeReferralsIcon,
  DeveloperMode as DeveloperPortalIcon,
  Api as ApiManagementIcon,
  Storefront as MarketplaceIcon,
  Webhook as WebhooksIcon,
  Insights as ExecutiveIntelligenceIcon,
  Assessment as BusinessIntelligenceIcon,
  Storage as DataWarehouseIcon,
  Psychology as AiInsightsIcon,
  ShowChart as ForecastingIcon,
  ManageAccounts as ManageAccountsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';

interface RecruiterSidebarProps {
  onTabChange?: (tabId: string) => void;
  currentTab?: string;
  companyName?: string;
  companyLogo?: string;
  credits?: number;
  planName?: string;
  readOnly?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  hideMobileTrigger?: boolean;
}

const MotionBox = motion(Box);

export const RecruiterSidebar: React.FC<RecruiterSidebarProps> = ({
  onTabChange,
  currentTab = 'overview',
  companyName = 'Your Company',
  companyLogo,
  credits = 0,
  planName = 'Free',
  readOnly = false,
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
  hideMobileTrigger = false,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen;
  const setMobileOpen = (open: boolean) => {
    onMobileOpenChange?.(open);
    if (controlledMobileOpen === undefined) setInternalMobileOpen(open);
  };
  const mobileCompact = isMobile;

  const menuSections = [
    { label: 'Workspace', items: [
      { id: 'overview', label: 'Overview', icon: DashboardIcon },
      { id: 'jobs', label: 'Jobs', icon: WorkIcon },
      { id: 'applicants', label: 'Applicants', icon: PeopleIcon },
      { id: 'ats-pipeline', label: 'ATS Pipeline', icon: AccountTreeIcon },
      { id: 'messages', label: 'Messages', icon: MailIcon },
      { id: 'interview-management', label: 'Interviews', icon: EventIcon },
    ] },
    { label: 'Candidates', items: [
      { id: 'find-candidates', label: 'Find Candidates', icon: SearchIcon },
      { id: 'talent-pool', label: 'Talent Pool', icon: PoolIcon },
      { id: 'tags', label: 'Candidate Tags', icon: TagIcon },
      { id: 'assessments', label: 'Assessments', icon: AssessmentsIcon },
      { id: 'employee-referrals', label: 'Referrals', icon: EmployeeReferralsIcon },
      { id: 'talent-community', label: 'Talent Community', icon: TalentCommunityIcon },
    ] },
    { label: 'Intelligence', items: [
      { id: 'analytics', label: 'Analytics', icon: QueryStatsIcon },
      { id: 'market-intelligence', label: 'Market Intelligence', icon: MarketIntelligenceIcon },
      { id: 'ai-hiring-assistant', label: 'AI Hiring Assistant', icon: SmartToyIcon },
      { id: 'automation-center', label: 'Automation', icon: SettingsSuggestIcon },
      { id: 'executive-intelligence', label: 'Executive Intelligence', icon: ExecutiveIntelligenceIcon },
      { id: 'business-intelligence', label: 'Business Intelligence', icon: BusinessIntelligenceIcon },
      { id: 'data-warehouse', label: 'Data Warehouse', icon: DataWarehouseIcon },
      { id: 'ai-insights', label: 'AI Insights', icon: AiInsightsIcon },
      { id: 'forecasting', label: 'Forecasting', icon: ForecastingIcon },
    ] },
    { label: 'Company', items: [
      { id: 'team-management', label: 'Team Management', icon: GroupIcon },
      { id: 'organization', label: 'Organization', icon: OrganizationIcon },
      { id: 'integrations', label: 'Integrations', icon: IntegrationInstructionsIcon },
      { id: 'developer-portal', label: 'Developer Portal', icon: DeveloperPortalIcon },
      { id: 'api-management', label: 'API Management', icon: ApiManagementIcon },
      { id: 'marketplace', label: 'Marketplace', icon: MarketplaceIcon },
      { id: 'webhooks', label: 'Webhooks', icon: WebhooksIcon },
    ] },
    { label: 'Account', items: [
      { id: 'security-center', label: 'Security Center', icon: SecurityCenterIcon },
      { id: 'mobile-pwa', label: 'Mobile & PWA', icon: MobilePwaIcon },
      { id: 'billing-subscription', label: 'Billing & Subscription', icon: ReceiptIcon },
      { id: 'my-details', label: 'My Details', icon: ManageAccountsIcon },
    ] },
  ];

  const handleMenuClick = (itemId: string) => {
    if (readOnly && itemId !== 'overview' && itemId !== 'my-details') {
      return;
    }
    if (itemId === 'home') {
      navigate('/');
      return;
    }
    onTabChange?.(itemId);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0B1325 0%, #121E37 30%, #0D1730 100%)',
        borderRight: '1px solid rgba(125, 146, 180, 0.24)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08), 18px 0 40px rgba(15, 23, 42, 0.18)',
        position: 'relative',
        width: mobileCompact ? 240 : '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(91,140,255,0.22), transparent 25%), radial-gradient(circle at bottom left, rgba(139,92,246,0.2), transparent 30%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ px: mobileCompact ? 1.8 : 2.5, py: mobileCompact ? 1.2 : 1.75, borderBottom: '1px solid rgba(255,255,255,0.09)', position: 'relative', zIndex: 1 }}>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to Jobpoyt home"
          title="Go to Jobpoyt home"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: mobileCompact ? 30 : 38,
            p: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            '&:hover img': { transform: 'scale(1.03)', filter: 'drop-shadow(0 8px 16px rgba(94,234,212,0.28))' },
          }}
        >
          <Box
            component="img"
            src="/white%20jobpoyt.png.png"
            alt="Jobpoyt"
            sx={{
              display: 'block',
              width: 'auto',
              maxWidth: '100%',
              height: 'auto',
              maxHeight: mobileCompact ? 28 : 38,
              objectFit: 'contain',
              objectPosition: 'left center',
              transition: 'transform 0.2s ease, filter 0.2s ease',
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: mobileCompact ? 0.75 : 1, color: 'rgba(191,219,254,0.72)', fontSize: mobileCompact ? '0.58rem' : '0.68rem', letterSpacing: 0.9, textTransform: 'uppercase' }}
        >
          Recruiter Dashboard
        </Typography>
      </Box>

      <List sx={{ flex: 1, minHeight: 0, py: mobileCompact ? 0.75 : 1.5, overflowY: 'auto', position: 'relative', zIndex: 1, '&::-webkit-scrollbar': { width: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(148,163,184,0.34)', borderRadius: 99 } }}>
        {menuSections.map((section, sectionIndex) => (
          <Box key={section.label} sx={{ mb: mobileCompact ? 0.8 : 1.5 }}>
            <Typography sx={{ px: mobileCompact ? 1.8 : 2.5, pt: sectionIndex ? 0.7 : 0.2, pb: mobileCompact ? 0.35 : 0.7, color: 'rgba(191,219,254,0.52)', fontSize: mobileCompact ? 9 : 10, fontWeight: 800, letterSpacing: mobileCompact ? 0.9 : 1.1, textTransform: 'uppercase' }}>{section.label}</Typography>
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id && !item.external;
              const isReadOnlyItem = readOnly && item.id !== 'overview' && item.id !== 'my-details';
              return (
                <motion.div key={item.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.22, delay: Math.min(0.3, sectionIndex * 0.04 + itemIndex * 0.018) }}>
                  <ListItem disablePadding sx={{ mb: mobileCompact ? 0.05 : 0.1 }}>
                    <ListItemButton
                      onClick={() => handleMenuClick(item.id)}
                      disabled={isReadOnlyItem}
                      sx={{
                        mx: mobileCompact ? 0.8 : 1.1,
                        minHeight: mobileCompact ? 38 : 46,
                        px: mobileCompact ? 0.8 : 1.25,
                        borderRadius: 2.2,
                        background: isActive ? 'linear-gradient(90deg, rgba(91,140,255,0.22), rgba(139,92,246,0.12))' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'rgba(226,232,240,0.76)',
                        borderLeft: isActive ? '3px solid #7DD3FC' : '3px solid transparent',
                        boxShadow: isActive ? '0 12px 28px rgba(91,140,255,0.2)' : 'none',
                        transition: 'all 0.2s ease, transform 0.2s ease',
                        opacity: isReadOnlyItem ? 0.42 : 1,
                        cursor: isReadOnlyItem ? 'not-allowed' : 'pointer',
                        '&.Mui-disabled': { color: 'rgba(226,232,240,0.42)' },
                        '&:hover': {
                          backgroundColor: 'rgba(148,163,184,0.12)',
                          color: '#FFFFFF',
                          transform: 'translateX(2px)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: mobileCompact ? 28 : 36,
                          color: isActive ? '#7DD3FC' : 'rgba(191,219,254,0.72)',
                        }}
                      >
                        <Icon sx={{ fontSize: mobileCompact ? '1rem' : '1.2rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        secondary={item.id === 'billing-subscription' ? `${planName}` : undefined}
                        primaryTypographyProps={{
                          fontSize: mobileCompact ? '0.74rem' : '0.82rem',
                          fontWeight: isActive ? 800 : 600,
                          lineHeight: 1.2,
                        }}
                        secondaryTypographyProps={{
                          fontSize: mobileCompact ? '0.62rem' : '0.72rem',
                          color: isActive ? '#BEE3FF' : 'rgba(191,219,254,0.54)',
                          sx: { mt: 0.1, lineHeight: 1.2 },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              );
            })}
          </Box>
        ))}
      </List>

      <Box sx={{ mx: mobileCompact ? 0.9 : 1.5, mb: mobileCompact ? 0.9 : 1.5, p: mobileCompact ? 1.1 : 1.4, borderRadius: 2.2, bgcolor: 'rgba(91,140,255,0.12)', border: '1px solid rgba(125, 211, 252, 0.22)', boxShadow: '0 12px 28px rgba(91,140,255,0.12)', position: 'relative', zIndex: 1 }}>
        <Typography sx={{ color: '#99F6E4', fontSize: mobileCompact ? 9 : 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>{planName} workspace</Typography>
        <Typography sx={{ color: 'rgba(226,232,240,0.72)', fontSize: mobileCompact ? 10 : 11, mt: 0.35 }}>{credits.toLocaleString()} credits available</Typography>
      </Box>
    </MotionBox>
  );

  if (isMobile) {
    return (
      <>
        {!hideMobileTrigger && (
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 2 }}>
            <Box
              component="button"
              type="button"
              className="recruiter-menu-trigger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open recruiter navigation menu"
              title="Open recruiter navigation menu"
            >
              <MenuIcon />
              <Typography component="span">Menu</Typography>
            </Box>
          </Box>
        )}
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1.5,
              py: 1.25,
              borderBottom: `1px solid ${themeColors.border}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Menu
            </Typography>
            <IconButton onClick={() => setMobileOpen(false)} sx={{ width: 30, height: 30 }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {sidebarContent}
        </Drawer>
      </>
    );
  }

  return (
    <Box sx={{ width: 280, height: '100vh', position: 'sticky', top: 0 }}>
      {sidebarContent}
    </Box>
  );
};
