const BackToTop = () => {
    const handleScrollTop = () => {

        document.documentElement.scrollTo({
        top: 0,
        behavior: "smooth"
        });

        document.body.scrollTo({
        top: 0,
        behavior: "smooth"
        });
    };

    return (
        <button
        className="back-to-top"
        onClick={handleScrollTop}
        >
        ↑
        </button>
    );
};

export default BackToTop;
