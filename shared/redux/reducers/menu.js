import links from 'helpers/links'


export const initialState = {
  items: [
    {
      title: 'Wallet',
      link: links.home,
      exact: true,
    },
    {
      title: 'Exchange',
      link: links.exchange,
    },
    {
      title: 'History',
      link: links.history,
    },
    {
      title: 'Affiliate',
      link: links.affiliate,
      isMobile: false,
    },
    {
      title: 'Listing',
      link: links.listing,
      isMobile: false,
    },
  ],
}
